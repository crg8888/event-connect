import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ total: 0, claimed: [], interests: [] });

  const claimed = await sql`
    select id, name, headline, looking_for, claimed_at, linkedin_url
    from attendees where claimed and event_id = ${event.id} order by claimed_at desc
  `;
  const interests = await sql`
    select s.created_at,
           o.id as owner_id, o.name as owner_name, o.looking_for as owner_wants,
           t.id as saved_id, t.name as saved_name, t.headline as saved_headline,
           t.linkedin_url as saved_linkedin
    from saves s
    join attendees o on o.id = s.owner_id
    join attendees t on t.id = s.saved_id
    where o.event_id = ${event.id}
    order by s.created_at desc
  `;
  const [{ count: total }] = await sql`
    select count(*)::int as count from attendees where event_id = ${event.id}
  `;
  return NextResponse.json({ total, claimed, interests });
}
