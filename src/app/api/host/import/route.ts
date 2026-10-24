import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { guests } = await req.json();
  if (!Array.isArray(guests)) {
    return NextResponse.json({ error: "guests array required" }, { status: 400 });
  }

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ error: "Register your event first" }, { status: 400 });

  const emails = guests
    .map((g: { email?: string }) => (g.email ?? "").toLowerCase().trim())
    .filter(Boolean);

  const matched = await sql`
    update attendees set event_id = ${event.id}
    where lower(email) = any(${emails})
    returning id, name, email, linkedin_url, headline, description, luma_bio, avatar_url
  `;
  matched.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    total: guests.length,
    enriched: matched,
    linkedinCount: matched.filter((m) => m.linkedin_url).length,
  });
}
