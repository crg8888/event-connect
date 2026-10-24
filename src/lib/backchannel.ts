import { sql } from "./db";
import { launchAgent } from "./omnara";

type FeedItem = {
  id: number;
  name: string;
  headline: string | null;
  linkedin_url: string | null;
  looking_for: string | null;
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
    select id, name, headline, description, linkedin_url, looking_for
    from attendees
    where event_id = ${eventId} and claimed
    order by claimed_at desc
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
      if (a.looking_for) parts.push(`WANTS: ${a.looking_for}`);
      return parts.join(" | ");
    })
    .join("\n");

  const instruction = `You are Backchannel's organizer intelligence. You are reading the room on behalf of the EVENT ORGANIZER to help them hit their agenda.

EVENT: ${event.name}
ORGANIZER AGENDA (treat this as the organizer's primary objective — potential customers, hires, teammates for the host team, or anyone materially useful to the agenda):
${event.agenda}

CLAIMED ATTENDEES (ranked chronologically newest first):
${roster}

TASK: Rank each claimed attendee by how useful they are to the organizer right now. A HIGHER score means the attendee is more actionable for the agenda — e.g. they could become a customer, they're building something adjacent, they explicitly want something the organizer offers, or they can open relevant doors.

Return VALID JSON ONLY (no markdown fences), shape:
{"items": [{"id": <number>, "score": <1-10 int>, "why": "<ONE short sentence, specific, no filler>"}]}
Include EVERY attendee by id. Do not invent ids. The "why" names the exact overlap between attendee and agenda — no "great fit", no "could be useful".`;

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
      score: Math.max(1, Math.min(10, s?.score ?? 5)),
      why: s?.why ?? "",
    };
  });
  items.sort((a, b) => b.score - a.score);

  cache.set(eventId, { at: now, items });
  return items;
}

export function invalidateBackchannelCache(eventId: number) {
  cache.delete(eventId);
}
