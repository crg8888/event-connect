import { NextResponse } from "next/server";
import { researchNext } from "@/lib/research";
import { getOrganizer } from "@/lib/auth";
import { sql } from "@/lib/db";

export const maxDuration = 60;

export async function POST() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const [ev] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!ev) return NextResponse.json({ researched: 0 });
  const n = await researchNext(ev.id, 2);
  return NextResponse.json({ researched: n });
}
