import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";
import { scoreFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ ok: true });

  try {
    await scoreFeed(event.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("score error", e);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
