import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { invalidateFeedCache } from "@/lib/feed";

export async function POST(req: Request) {
  const { name, email, eventSlug, lookingFor } = await req.json();
  if (!name?.trim() || !email?.trim() || !eventSlug || !lookingFor?.trim()) {
    return NextResponse.json(
      { error: "Name, email, event, and what you want are required." },
      { status: 400 }
    );
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  const [event] = await sql`select id from events where slug = ${eventSlug}`;
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const existing = await sql`
    select id, claimed from attendees where lower(email) = ${cleanEmail}
  `;
  if (existing.length) {
    const row = existing[0];
    if (row.claimed) {
      return NextResponse.json(
        { error: "That email is already in the room. Use the claim flow instead." },
        { status: 409 }
      );
    }
    const [updated] = await sql`
      update attendees set
        claimed = true,
        event_id = ${event.id},
        looking_for = ${lookingFor.slice(0, 300)},
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
      claimed, looking_for, claimed_at
    )
    values (
      ${cleanName}, ${first}, ${last}, ${cleanEmail}, ${event.id},
      true, ${lookingFor.slice(0, 300)}, now()
    )
    returning id, name
  `;
  invalidateFeedCache(event.id);
  return NextResponse.json(row);
}
