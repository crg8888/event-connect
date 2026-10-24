import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

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
    return NextResponse.json(scraped);
  } catch (e) {
    console.error("luma scrape error", e);
    return NextResponse.json(
      { error: "Luma didn't respond. Enter the details manually." },
      { status: 502 }
    );
  }
}
