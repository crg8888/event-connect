import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";
import { buildFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ items: [] });

  try {
    const items = await buildFeed(event.id);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("feed error", e);
    return NextResponse.json({ items: [], error: "feed temporarily unavailable" });
  }
}
