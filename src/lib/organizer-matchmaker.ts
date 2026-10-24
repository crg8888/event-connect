import { sql } from "./db";

export async function buildOrganizerInstruction(organizerId: number): Promise<string> {
  const [event] = await sql`
    select id, name, agenda from events where organizer_id = ${organizerId} order by id desc limit 1
  `;
  if (!event) throw new Error("Register your event first.");

  const attendees = await sql`
    select id, name, headline, description, luma_bio, linkedin_url, claimed, looking_for, research
    from attendees where event_id = ${event.id} order by claimed desc, id
  `;

  const roster = attendees
    .map((a) => {
      const parts = [`#${a.id} ${a.name}`];
      if (a.headline) parts.push(a.headline);
      const about = a.description ?? a.luma_bio;
      if (about) parts.push(about);
      if (a.claimed && a.looking_for) parts.push(`WANTS TODAY: ${a.looking_for}`);
      if (a.research)
        parts.push(`RESEARCH: ${String(a.research).replace(/\n/g, " ")}`);
      if (a.claimed) parts.push(`[CLAIMED]`);
      if (a.linkedin_url) parts.push(`LINKEDIN: ${a.linkedin_url}`);
      return parts.join(" | ");
    })
    .join("\n");

  const finderAsks = await sql`
    select cm.attendee_id, a.name, left(cm.content->>'text', 160) as text
    from chat_messages cm
    join attendees a on a.id = cm.attendee_id
    where a.event_id = ${event.id} and cm.role = 'user'
    order by cm.id desc
    limit 120
  `;
  const asksByPerson = new Map<number, { name: string; texts: string[] }>();
  for (const r of finderAsks) {
    const entry: { name: string; texts: string[] } =
      asksByPerson.get(r.attendee_id) ?? { name: r.name, texts: [] };
    if (entry.texts.length < 6) entry.texts.push(String(r.text));
    asksByPerson.set(r.attendee_id, entry);
  }
  const finderBlock = asksByPerson.size
    ? `
CONCIERGE CHAT INTEL (what each attendee has privately asked the event concierge — the strongest live intent signal you have; newest first):
${Array.from(asksByPerson.entries())
  .map(([id, e]) => `#${id} ${e.name}: ${e.texts.map((t) => `"${t}"`).join(" · ")}`)
  .join("\n")}
`
    : "";

  const dms = await sql`
    select left(p.message, 160) as message, s.name as sender, r.name as recipient
    from pings p
    join attendees s on s.id = p.sender_id
    join attendees r on r.id = p.recipient_id
    where s.event_id = ${event.id}
    order by p.id desc
    limit 120
  `;
  const dmBlock = dms.length
    ? `
ATTENDEE-TO-ATTENDEE MESSAGES (who is talking to whom; newest first):
${dms.map((d) => `${d.sender} → ${d.recipient}: "${d.message}"`).join("\n")}
`
    : "";

  return `You are Envoy's organizer concierge at ${event.name}. You work for the HOST, not the attendees. Your job is to surface the right people to meet the host's agenda — think of this as a sales / recruiting / connections funnel for the organizer.

ORGANIZER AGENDA:
${event.agenda}

THE ROOM (full attendee roster, [CLAIMED] = checked in and present):
${roster}
${finderBlock}${dmBlock}
HOW YOU OPERATE:
- Prioritize [CLAIMED] attendees — they are actually in the room right now.
- Rank matches by how well they advance the agenda. An attendee who could become a customer, a hire, a partner, or a teammate for the host team ranks higher.
- If an attendee's WANTS or background aligns with what the host offers in the agenda, that is the strongest signal — surface them first.
- Return at most 3 people per reply. Quality over quantity.
- Never invent attendees or facts. Roster and chat intel only.
- LEAD QUALIFICATION: when the host asks to "go deeper" on someone or qualify them, mine the chat intel — what they asked the concierge and who they're messaging reveals live intent that the bio never will. Someone asking for intros to customers, co-founders, or specific tech is a warm lead for a matching agenda.
- Be discreet with chat intel: synthesize and paraphrase intent ("she's actively hunting for a voice-agent co-founder"), don't read full message logs back. Share a direct quote only if the host explicitly asks what someone said.
- "why" = ONE sentence that names the exact overlap between the attendee and the agenda. No "great fit", no "synergy".
- "icebreaker" = a sharp opening the organizer could DM them. Specific. Zero cringe.
- "reply" = one short sentence summarizing the pick, like a sharp chief-of-staff texting.

OUTPUT: valid JSON only, no markdown fences:
{"reply": "...", "matches": [{"id": 12, "name": "Full Name", "why": "...", "icebreaker": "..."}]}
Non-match questions: same shape, empty matches, answer in "reply".`;
}
