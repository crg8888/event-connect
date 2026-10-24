import { NextResponse } from "next/server";
import { launchAgent } from "@/lib/omnara";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Scraped = {
  name: string | null;
  description: string | null;
  location: string | null;
  image: string | null;
};

async function scrapeLuma(url: string): Promise<Scraped> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`luma ${res.status}`);
  const html = await res.text();

  // Primary: JSON-LD Event schema
  const ldMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (ldMatch) {
    try {
      const data = JSON.parse(ldMatch[1]);
      const name = data.name ?? null;
      const description = data.description ?? null;
      const loc = data.location;
      const location =
        typeof loc === "object" && loc
          ? (loc.name ?? loc.address?.addressLocality ?? null)
          : null;
      const image = Array.isArray(data.image) ? data.image[0] : data.image ?? null;
      if (name || description) return { name, description, location, image };
    } catch {}
  }

  // Fallback: OG tags
  const og = (prop: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );
    return html.match(re)?.[1] ?? null;
  };
  const name = og("og:title")?.replace(/\s*·\s*Luma$/i, "") ?? null;
  const description = og("og:description");
  const image = og("og:image");
  return { name, description, location: null, image };
}

async function synthesize(input: {
  name: string | null;
  description: string | null;
  location: string | null;
}): Promise<{ agenda: string; agent_name: string; welcome: string } | null> {
  if (!input.name && !input.description) return null;
  const instruction = `You distill a public event page into three fields for the event host's agent assistant.

EVENT NAME: ${input.name ?? ""}
LOCATION: ${input.location ?? ""}
PUBLIC DESCRIPTION FROM THE LUMA PAGE:
${input.description ?? ""}

Produce JSON with three fields:
- agenda: 1-2 crisp sentences in the HOST's first-person voice stating what they want out of the room (who they want attendees to meet, what they want attendees to do). NOT a repeat of the event description. Think "sharp chief of staff" summarizing the host's actual goal.
- agent_name: ONE short, event-themed name for the host's AI concierge (e.g. 'Builder' for a hackathon, 'Scout' for an investor mixer, 'Curator' for an art show). Default to 'Envoy' only if nothing fits. Max 10 characters.
- welcome: a 2-3 line first message the concierge sends every attendee when they claim their profile. Use {first_name} once. Mention one concrete thing about this event (the key resource, URL, prize, or opportunity). End with a prompt that nudges them to ask the concierge something.

Output VALID JSON only, no markdown fences:
{"agenda": "...", "agent_name": "...", "welcome": "..."}`;

  try {
    const { reply } = await launchAgent(
      instruction,
      "Give me the three fields.",
      `luma-synth-${Date.now()}`
    );
    const cleaned = reply.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      agenda: String(parsed.agenda ?? "").trim(),
      agent_name: String(parsed.agent_name ?? "Envoy").trim().slice(0, 20),
      welcome: String(parsed.welcome ?? "").trim(),
    };
  } catch (e) {
    console.error("luma synthesis failed", e);
    return null;
  }
}

export async function POST(req: Request) {
  const { lumaUrl } = await req.json();
  if (!lumaUrl || typeof lumaUrl !== "string" || !/luma\.com/.test(lumaUrl)) {
    return NextResponse.json(
      { error: "A luma.com link is required." },
      { status: 400 }
    );
  }
  try {
    const scraped = await scrapeLuma(lumaUrl.trim());
    if (!scraped.name && !scraped.description) {
      return NextResponse.json(
        { error: "Could not read that Luma page." },
        { status: 502 }
      );
    }
    const synth = await synthesize(scraped);
    return NextResponse.json({
      ...scraped,
      agenda: synth?.agenda ?? scraped.description ?? "",
      agent_name: synth?.agent_name ?? "Envoy",
      welcome: synth?.welcome ?? "",
    });
  } catch (e) {
    console.error("luma scrape error", e);
    return NextResponse.json(
      { error: "Luma didn't respond. Enter the details manually." },
      { status: 502 }
    );
  }
}
