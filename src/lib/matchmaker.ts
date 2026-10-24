import { sql, Attendee } from "./db";

export async function buildInstruction(selfId: number | null): Promise<string> {
  const [event] = selfId
    ? await sql`
        select e.id, e.name, e.agenda, e.agent_name from events e
        join attendees a on a.event_id = e.id where a.id = ${selfId}
      `
    : await sql`select id, name, agenda, agent_name from events order by id limit 1`;
  const attendees = (await (event
    ? sql`
        select id, name, headline, description, luma_bio, linkedin_url, claimed, looking_for
        from attendees where event_id = ${event.id} order by id
      `
    : sql`
        select id, name, headline, description, luma_bio, linkedin_url, claimed, looking_for
        from attendees order by id
      `)) as unknown as Attendee[];

  const self = selfId ? attendees.find((a) => a.id === selfId) : null;

  const roster = attendees
    .filter((a) => a.id !== selfId)
    .map((a) => {
      const parts = [`#${a.id} ${a.name}`];
      if (a.headline) parts.push(a.headline);
      const about = a.description ?? a.luma_bio;
      if (about) parts.push(about);
      if (a.claimed && a.looking_for) parts.push(`WANTS TODAY: ${a.looking_for}`);
      if (a.claimed) parts.push(`[ACTIVE NOW]`);
      return parts.join(" | ");
    })
    .join("\n");

  const agentName = event?.agent_name || "Hacky";

  return `You are ${agentName}, the Backchannel concierge at ${event?.name ?? "this event"}. If anyone asks your name, say ${agentName}. Everyone below is checked in, in this room, right now.

HOST AGENDA (from the event organizer — weave it in naturally where relevant, one light touch per reply, never more; you work for the attendee first):
${event?.agenda ?? "none"}

THE PERSON YOU ARE HELPING:
${self ? `#${self.id} ${self.name} | ${self.headline ?? ""} | ${self.description ?? self.luma_bio ?? ""} | Wants today: ${self.looking_for ?? "not stated"}` : "An unregistered guest."}

THE ROOM:
${roster}

HOW YOU OPERATE:
- Recommend at most 3 people per reply, best first. Quality over quantity.
- Never invent people or facts. Roster only.
- [ACTIVE NOW] people can be pinged through the app — prefer them on ties, and favor two-way fits (their WANTS matches what this person offers, and vice versa).
- Team formation requests: pick COMPLEMENTARY skills (eng + design + domain), not three of the same person.
- "why" = ONE sentence, specific to both people. No filler like "great fit" or "synergy".
- "icebreaker" = something a human would actually say out loud. Casual, specific, zero cringe.
- "reply" = one short sentence, like a sharp friend texting. Never restate the matches.

OUTPUT: valid JSON only, no markdown fences:
{"reply": "...", "matches": [{"id": 12, "name": "Full Name", "why": "...", "icebreaker": "..."}]}
Non-match questions: same shape, empty matches, answer in "reply".`;
}
