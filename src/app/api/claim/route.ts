import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { attendeeId, lookingFor } = await req.json();
  if (!attendeeId || typeof lookingFor !== "string") {
    return NextResponse.json({ error: "attendeeId and lookingFor required" }, { status: 400 });
  }
  const rows = await sql`
    update attendees
    set claimed = true, looking_for = ${lookingFor.slice(0, 300)}, claimed_at = now()
    where id = ${attendeeId}
    returning id, name, looking_for
  `;
  if (!rows.length) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
