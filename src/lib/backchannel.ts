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
};

const cache = new Map<number, { at: number; items: FeedItem[] }>();
const TTL = 30_000;

export async function buildBackchannelFeed(eventId: number): Promise<FeedItem[]> {
  const now = Date.now();
  const cached = cache.get(eventId);
  if (cached && now - cached.at < TTL) return cached.items;

  const [event] = await sql`
    select id, name, agenda from events where id = ${eventId}
  `;
  if (!event) return [];

  const attendees = await sql`
    select id, name, headline, description, linkedin_url, looking_for,
           claimed, claimed_at
    from attendees
    where event_id = ${eventId}
    order by claimed desc, claimed_at desc nulls last, id
  `;

  if (attendees.length === 0) {
    cache.set(eventId, { at: now, items: [] });
    return [];
  }

  const roster = attendees
    .map((a) => {
      const parts = [`#${a.id} ${a.name}`];
      if (a.headline) parts.push(a.headline);
      if (a.description) parts.push(a.description);
      if (a.claimed && a.looking_for) parts.push(`WANTS: ${a.looking_for}`);
      if (a.claimed) parts.push("[LIVE]");
      return parts.join(" | ");
    })
    .join("\n");

  const instruction = `You are Backchannel's organizer intelligence. You read the full guest list on behalf of the EVENT ORGANIZER to help them prioritize who to talk to.

EVENT: ${event.name}

ORGANIZER AGENDA (treat this as the host's primary objective — potential customers, hires, teammates for the host team, warm doors, or anyone materially useful to the agenda):
${event.agenda}

FULL ROSTER (every attendee on the guest list — those marked [LIVE] have already claimed their profile and are physically in the room; treat [LIVE] as a strong actionability bonus but still rank unclaimed attendees so the organizer can prep outreach):
${roster}

TASK: Score every attendee from 1 (irrelevant) to 10 (critical). A HIGHER score means the attendee is more useful to the agenda — they could become a customer, they're building something adjacent, they explicitly want something the organizer offers, or they can open relevant doors. Factor [LIVE] in as an actionability bonus (someone useful AND in the room ranks higher than someone equally useful but not yet checked in).

Return VALID JSON ONLY (no markdown fences), shape:
{"items": [{"id": <number>, "score": <1-10 int>, "why": "<ONE short sentence, specific, no filler>"}]}
Include EVERY attendee by id. Do not invent ids. The "why" names the exact overlap between attendee and agenda. No "great fit", no "could be useful", no filler. NEVER include the token [LIVE] or the word "LIVE" in the "why" sentence — that marker is a signal only, not output. One sentence.`;

  const name = `backchannel-feed-${eventId}-${now}`;
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
    };
  });

  cache.set(eventId, { at: now, items });
  return items;
}

export function invalidateBackchannelCache(eventId: number) {
  cache.delete(eventId);
}
