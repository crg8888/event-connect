import { launchAgent } from "./omnara";

async function fetchLumaTitle(url: string): Promise<string | null> {
  if (!url || !/luma\.com/.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/og:title"\s+content="([^"]+)"/i);
    const raw = m?.[1] ?? null;
    return raw?.replace(/\s*·\s*Luma$/i, "").trim() || null;
  } catch {
    return null;
  }
}

function parseList(raw: string): string[] {
  try {
    const cleaned = raw.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const items = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    return items
      .map((s: unknown) => String(s).trim())
      .filter((s: string) => s.length > 0 && s.length <= 80)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateOrganizerSuggestions(input: {
  eventName: string;
  agenda: string;
  lumaUrl: string | null;
}): Promise<string[]> {
  const lumaTitle = input.lumaUrl ? await fetchLumaTitle(input.lumaUrl) : null;
  const lumaLine = lumaTitle ? `LUMA EVENT TITLE: ${lumaTitle}` : "";

  const instruction = `You generate 3 short chip prompts for the organizer's concierge chatbot on their event dashboard. The organizer taps these to find useful people in the room FAST.

EVENT NAME: ${input.eventName}
${lumaLine}
ORGANIZER AGENDA (what the host wants out of this room):
${input.agenda}

RULES:
- 3 questions, max 8 words each.
- Written in the organizer's voice — think "sharp chief of staff."
- Specific to THIS event's agenda, not generic networking fluff.
- No "the room" / "attendees" filler. Just the request.
- Each should surface a different kind of person (customer, hire, teammate, partner, door-opener). Don't repeat angles.

Output VALID JSON only, no markdown fences:
{"suggestions": ["...", "...", "..."]}`;

  const { reply } = await launchAgent(
    instruction,
    "Give me the three chip prompts.",
    `bc-org-suggestions-${Date.now()}`
  );
  return parseList(reply);
}

export async function generateAttendeeSuggestions(input: {
  eventName: string;
  agenda: string;
  attendeeName: string;
  headline: string | null;
  description: string | null;
  lookingFor: string | null;
}): Promise<string[]> {
  const instruction = `You generate 3 short chip prompts for an ATTENDEE's concierge chatbot at an event. Personalize them to what this attendee said they want today.

EVENT: ${input.eventName}
EVENT AGENDA: ${input.agenda}

THIS ATTENDEE:
${input.attendeeName} | ${input.headline ?? ""} | ${input.description ?? ""}
WHAT THEY WANT TODAY: ${input.lookingFor ?? "not stated"}

RULES:
- 3 questions, max 8 words each.
- Written in the attendee's voice — as if they typed it.
- Specific to their stated want AND background, not generic.
- Each surfaces a different kind of ask (match by skill, match by goal, roam-the-room exploration).
- No fluff. No "the room". No "attendees".

Output VALID JSON only, no markdown fences:
{"suggestions": ["...", "...", "..."]}`;

  const { reply } = await launchAgent(
    instruction,
    "Give me the three chip prompts.",
    `bc-att-suggestions-${Date.now()}`
  );
  return parseList(reply);
}
