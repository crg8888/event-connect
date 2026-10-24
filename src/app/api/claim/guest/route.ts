import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { invalidateFeedCache } from "@/lib/feed";

export async function POST(req: Request) {
  const { name, email, eventSlug, lookingFor, linkedinUrl } = await req.json();
  if (!name?.trim() || !email?.trim() || !eventSlug || !lookingFor?.trim()) {
    return NextResponse.json(
      { error: "Name, email, event, and what you want are required." },
      { status: 400 }
    );
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanLinkedin =
    typeof linkedinUrl === "string" && /linkedin\.com\//i.test(linkedinUrl)
      ? linkedinUrl.trim().slice(0, 300)
      : null;

  const [event] = await sql`select id from events where slug = ${eventSlug}`;
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const existing = await sql`
    select id, claimed from attendees where lower(email) = ${cleanEmail}
  `;
  if (existing.length) {
    // email already on the roster — treat as re-login (updates purpose, keeps claim)
    const row = existing[0];
    const [updated] = await sql`
      update attendees set
        claimed = true,
        event_id = ${event.id},
        looking_for = ${lookingFor.slice(0, 300)},
        linkedin_url = coalesce(${cleanLinkedin}, linkedin_url),
        claimed_at = now()
      where id = ${row.id}
      returning id, name
    `;
    invalidateFeedCache(event.id);
    return NextResponse.json(updated);
  }

  const [first, ...rest] = cleanName.split(/\s+/);
  const last = rest.join(" ") || null;
  const [row] = await sql`
    insert into attendees (
      name, first_name, last_name, email, event_id,
      claimed, looking_for, linkedin_url, claimed_at
    )
    values (
      ${cleanName}, ${first}, ${last}, ${cleanEmail}, ${event.id},
      true, ${lookingFor.slice(0, 300)}, ${cleanLinkedin}, now()
    )
    returning id, name
  `;
  invalidateFeedCache(event.id);
  return NextResponse.json(row);
}
