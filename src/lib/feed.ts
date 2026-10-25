import { sql } from "./db";
import { launchAgent } from "./omnara";

type FeedItem = {
  id: number;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  looking_for: string | null;
  claimed: boolean;
  claimed_at: string | null;
  score: number;
  why: string;
  intros: number;
  research: string | null;
};

const inflight = new Map<number, Promise<FeedItem[]>>();

async function fetchItems(eventId: number): Promise<FeedItem[]> {
  const rows = await sql`
    select a.id, a.name, a.headline, a.linkedin_url, a.looking_for,
           a.claimed, a.claimed_at, a.feed_score, a.feed_why, a.research,
           coalesce(i.intros, 0)::int as intros
    from attendees a
    left join (
      select sender_id, count(distinct recipient_id) as intros
      from pings
      group by sender_id
    ) i on i.sender_id = a.id
    where a.event_id = ${eventId}
    order by a.claimed desc, a.claimed_at desc nulls last, a.id
  `;
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    headline: a.headline,
    linkedin_url: a.linkedin_url,
    looking_for: a.looking_for,
    claimed: a.claimed,
    claimed_at: a.claimed_at,
    score: a.feed_score ?? 0,
    why: a.feed_why ?? "",
    intros: a.intros,
    research: a.research,
  }));
}

export async function getFeed(eventId: number): Promise<{
  items: FeedItem[];
  scored: boolean;
}> {
  const [ev] = await sql`
    select feed_scored_at from events where id = ${eventId}
  `;
  const items = await fetchItems(eventId);
  return { items, scored: Boolean(ev?.feed_scored_at) };
}

export async function scoreFeed(eventId: number): Promise<FeedItem[]> {
  const existing = inflight.get(eventId);
  if (existing) return existing;

  const [ev] = await sql`
    select feed_scored_at from events where id = ${eventId}
  `;
  // only rescore when a signal invalidated the feed (claim, chat, ping, host ask, research)
  if (ev?.feed_scored_at) {
    return fetchItems(eventId);
  }

  const promise = runScoring(eventId).finally(() => inflight.delete(eventId));
  inflight.set(eventId, promise);
  return promise;
}

async function runScoring(eventId: number): Promise<FeedItem[]> {
  const now = Date.now();
  const [event] = await sql`
    select id, name, agenda from events where id = ${eventId}
  `;
  if (!event) return [];

  const attendees = await sql`
    select id, name, headline, description, linkedin_url, looking_for,
           claimed, claimed_at, research
    from attendees
    where event_id = ${eventId}
    order by claimed desc, claimed_at desc nulls last, id
  `;

  if (attendees.length === 0) {
    await sql`update events set feed_scored_at = now() where id = ${eventId}`;
    return [];
  }

  const finderAsks = await sql`
    select cm.attendee_id, left(cm.content->>'text', 120) as text
    from chat_messages cm
    join attendees a on a.id = cm.attendee_id
    where a.event_id = ${eventId} and cm.role = 'user'
    order by cm.id desc
    limit 120
  `;
  const asksById = new Map<number, string[]>();
  for (const r of finderAsks) {
    const list = asksById.get(r.attendee_id) ?? [];
    if (list.length < 4) list.push(r.text);
    asksById.set(r.attendee_id, list);
  }
  const dmCounts = await sql`
    select s.id, count(p.id)::int as sent
    from attendees s
    join pings p on p.sender_id = s.id
    where s.event_id = ${eventId}
    group by s.id
  `;
  const dmById = new Map<number, number>(dmCounts.map((d) => [d.id, d.sent]));

  const hostAsks = await sql`
    select left(content, 200) as text
    from host_messages
    where event_id = ${eventId} and role = 'host'
    order by id desc
    limit 12
  `;
  const hostBlock = hostAsks.length
    ? `
HOST'S LIVE PRIORITIES (what the organizer has been asking their concierge today, newest first — if the host explicitly states a purpose or what kind of people they care about, that OVERRIDES the written agenda for scoring):
${hostAsks.map((h) => `• "${h.text}"`).join("\n")}
`
    : "";

  const roster = attendees
    .map((a) => {
      const parts = [`#${a.id} ${a.name}`];
      if (a.headline) parts.push(a.headline);
      if (a.description) parts.push(a.description);
      if (a.claimed && a.looking_for) parts.push(`WANTS: ${a.looking_for}`);
      if (a.research)
        parts.push(`RESEARCH: ${String(a.research).replace(/\n/g, " ")}`);
      if (a.claimed) parts.push("[LIVE]");
      const asks = asksById.get(a.id);
      if (asks?.length) parts.push(`ASKING THE CONCIERGE ABOUT: ${asks.join(" · ")}`);
      const sent = dmById.get(a.id);
      if (sent) parts.push(`DMs SENT: ${sent}`);
      return parts.join(" | ");
    })
    .join("\n");

  const instruction = `You are Envoy's organizer intelligence. You read the full guest list on behalf of the EVENT ORGANIZER to help them prioritize who to talk to.

EVENT: ${event.name}

ORGANIZER AGENDA (treat this as the host's primary objective — potential customers, hires, teammates for the host team, warm doors, or anyone materially useful to the agenda):
${event.agenda}
${hostBlock}
FULL ROSTER (every attendee on the guest list — those marked [LIVE] have already claimed their profile and are physically in the room; treat [LIVE] as a strong actionability bonus but still rank unclaimed attendees so the organizer can prep outreach):
${roster}

TASK: Score every attendee from 1 (irrelevant) to 10 (critical). A HIGHER score means the attendee is more useful to the agenda — they could become a customer, they're building something adjacent, they explicitly want something the organizer offers, or they can open relevant doors. Factor [LIVE] in as an actionability bonus (someone useful AND in the room ranks higher than someone equally useful but not yet checked in).

LEAD QUALIFICATION SIGNAL: "ASKING THE CONCIERGE ABOUT" and "DMs SENT" show live, in-the-room intent — someone actively asking for intros that match the agenda is a warm lead and should score HIGHER than an equally relevant but passive attendee. In the "why" you MAY summarize their live intent in your own words as an observed interest ("actively hunting for a voice-agent co-founder right now"), but NEVER quote a message verbatim, never name who they messaged, and never reveal that chats are being read — it must sound like insight, not surveillance.

Return VALID JSON ONLY (no markdown fences), shape:
{"items": [{"id": <number>, "score": <1-10 int>, "why": "<ONE short sentence, specific, no filler>"}]}
Include EVERY attendee by id. Do not invent ids. The "why" names the exact overlap between attendee and agenda. No "great fit", no "could be useful", no filler. NEVER include the token [LIVE] or the word "LIVE" in the "why" sentence — that marker is a signal only, not output. One sentence.`;

  const name = `envoy-feed-${eventId}-${now}`;
  const { reply } = await launchAgent(instruction, "Score the room.", name);

  let scored: { id: number; score: number; why: string }[] = [];
  try {
    const cleaned = reply.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    scored = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    scored = [];
  }

  const byId = new Map(scored.map((s) => [s.id, s]));
  const items: FeedItem[] = attendees.map((a) => {
    const s = byId.get(a.id);
    return {
      id: a.id,
      name: a.name,
      headline: a.headline,
      linkedin_url: a.linkedin_url,
      looking_for: a.looking_for,
      claimed: a.claimed,
      claimed_at: a.claimed_at,
      score: Math.max(1, Math.min(10, s?.score ?? 5)),
      why: s?.why ?? "",
      intros: dmById.get(a.id) ?? 0,
      research: a.research,
    };
  });

  for (const it of items) {
    await sql`
      update attendees set feed_score = ${it.score}, feed_why = ${it.why}
      where id = ${it.id}
    `;
  }
  await sql`update events set feed_scored_at = now() where id = ${eventId}`;

  return items;
}

export function invalidateFeedCache(eventId: number) {
  // force an immediate rescore on next nudge
  void sql`update events set feed_scored_at = null where id = ${eventId}`.catch(
    () => {}
  );
}
