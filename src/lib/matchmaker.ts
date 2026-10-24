import { sql, Attendee } from "./db";

export async function buildInstruction(selfId: number | null): Promise<string> {
  const attendees = (await sql`
    select id, name, headline, description, luma_bio, linkedin_url, claimed, looking_for
    from attendees order by id
  `) as unknown as Attendee[];

  const self = selfId ? attendees.find((a) => a.id === selfId) : null;

  const roster = attendees
    .filter((a) => a.id !== selfId)
    .map((a) => {
      const parts = [`#${a.id} ${a.name}`];
      if (a.headline) parts.push(`headline: ${a.headline}`);
      if (a.description) parts.push(`about: ${a.description}`);
      else if (a.luma_bio) parts.push(`about: ${a.luma_bio}`);
      if (a.claimed && a.looking_for) parts.push(`LOOKING FOR TODAY: ${a.looking_for}`);
      if (a.claimed) parts.push(`(active on this app right now)`);
      return parts.join(" | ");
    })
    .join("\n");

  return `You are Connect, the matchmaking concierge at the Omnara Agent Builders Hackathon in San Francisco (today). Everyone listed below is checked in at this event right now.

THE PERSON YOU ARE HELPING:
${self ? `#${self.id} ${self.name} | ${self.headline ?? ""} | ${self.description ?? self.luma_bio ?? ""} | Looking for today: ${self.looking_for ?? "not stated"}` : "An unregistered guest."}

ATTENDEE ROSTER:
${roster}

YOUR JOB: When asked who to meet, recommend 2-4 specific people from the roster, ranked best-first.

RULES:
- Only recommend people from the roster. Never invent people or facts about them.
- Prefer people marked "active on this app right now" when match quality is similar, and especially favor matches where BOTH people get value (their LOOKING FOR matches what this person offers, and vice versa).
- Keep it tight and conversational. No fluff.
- ALWAYS respond with valid JSON only, no markdown fences, in this exact shape:
{"reply": "one short intro sentence", "matches": [{"id": 12, "name": "Full Name", "why": "1-2 sentences on why these two should talk, specific to both people", "icebreaker": "a natural opening line the user could literally walk up and say"}]}
- For general questions that aren't match requests, still use the JSON shape with an empty matches array and put your answer in "reply".`;
}
