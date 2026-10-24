import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { attendeeId, text } = await req.json();
  if (!attendeeId || !text) {
    return NextResponse.json({ error: "attendeeId + text required" }, { status: 400 });
  }
  const existing = await sql`
    select 1 from chat_messages where attendee_id = ${attendeeId} limit 1
  `;
  if (existing.length) return NextResponse.json({ skipped: true });

  await sql`
    insert into chat_messages (attendee_id, role, content)
    values (${attendeeId}, 'agent', ${JSON.stringify({ text, matches: [], pings: [] })})
  `;
  return NextResponse.json({ ok: true });
}
