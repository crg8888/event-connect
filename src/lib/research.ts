import { sql } from "./db";
import { launchAgent } from "./omnara";

async function webSnippets(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const strip = (s: string) =>
      s
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
    const titles = Array.from(
      html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/g)
    ).map((m) => strip(m[1]));
    const snippets = Array.from(
      html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)
    ).map((m) => strip(m[1]));
    const out: string[] = [];
    for (let i = 0; i < Math.min(titles.length, 6); i++) {
      const line = snippets[i] ? `${titles[i]} — ${snippets[i]}` : titles[i];
      if (line) out.push(line.slice(0, 300));
    }
    return out;
  } catch {
    return [];
  }
}

function parseFacts(raw: string): string[] {
  try {
    const cleaned = raw.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const items = Array.isArray(parsed.facts) ? parsed.facts : [];
    return items
      .map((f: unknown) => String(f).trim())
      .filter((f: string) => f.length > 0 && f.length <= 160)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function researchAttendee(attendeeId: number): Promise<boolean> {
  const [claimed] = await sql`
    update attendees set researched_at = now()
    where id = ${attendeeId} and researched_at is null
    returning id
  `;
  if (!claimed) return false;

  const [a] = await sql`
    select a.id, a.name, a.headline, a.description, a.linkedin_url, a.research,
           e.name as event_name, e.agenda
    from attendees a join events e on e.id = a.event_id
    where a.id = ${attendeeId}
  `;
  if (!a) return false;

  try {
    const firstSegment = (a.headline ?? "").split(/[|·,@]/)[0].trim();
    const query = [a.name, firstSegment].filter(Boolean).join(" ");
    const snippets = await webSnippets(query);
    const webBlock = snippets.length
      ? `WEB SEARCH RESULTS for "${query}" (may include wrong people with similar names — only use results that clearly match this person's profile):
${snippets.map((s) => `• ${s}`).join("\n")}`
      : "No web results available.";

    const instruction = `You research one event attendee on behalf of the organizer. Distill FACTS about this person that are interesting and useful given the event's agenda.

EVENT: ${a.event_name}
ORGANIZER AGENDA: ${a.agenda}

PERSON:
Name: ${a.name}
Headline: ${a.headline ?? "unknown"}
Profile: ${a.description ?? "none"}
LinkedIn: ${a.linkedin_url ?? "none"}

${webBlock}

RULES:
- Facts ONLY — never speculate, never pad. If the web results don't clearly match this person, derive facts from the profile text alone.
- Each fact under 20 words, specific (companies, products, roles, projects), zero filler.
- Pick facts through the lens of the agenda: what would the organizer or other attendees find genuinely interesting about this person?
- 2 to 5 facts. If you can only support 2 solid facts, return 2.

Output VALID JSON only, no markdown fences:
{"facts": ["...", "..."]}`;

    const { reply } = await launchAgent(
      instruction,
      "Research this person.",
      `envoy-research-${attendeeId}-${Date.now()}`
    );
    const facts = parseFacts(reply);
    if (facts.length === 0) {
      await sql`update attendees set researched_at = null where id = ${attendeeId}`;
      return false;
    }
    const block = facts.map((f) => `• ${f}`).join("\n");
    const combined = a.research ? `${a.research}\n${block}` : block;
    await sql`
      update attendees set research = ${combined}, researched_at = now()
      where id = ${attendeeId}
    `;
    return true;
  } catch {
    await sql`update attendees set researched_at = null where id = ${attendeeId}`;
    return false;
  }
}

export async function researchNext(eventId: number, n = 2): Promise<number> {
  const rows = await sql`
    select id from attendees
    where event_id = ${eventId} and researched_at is null
    order by claimed desc, claimed_at desc nulls last, id
    limit ${n}
  `;
  if (rows.length === 0) return 0;
  const results = await Promise.all(rows.map((r) => researchAttendee(r.id)));
  return results.filter(Boolean).length;
}
