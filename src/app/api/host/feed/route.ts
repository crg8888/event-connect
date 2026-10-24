import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";
import { getFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ items: [], scored: false });

  try {
    const { items, scored } = await getFeed(event.id);
    return NextResponse.json({ items, scored });
  } catch (e) {
    console.error("feed error", e);
    return NextResponse.json({ items: [], scored: false });
  }
}
