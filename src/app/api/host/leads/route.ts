import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const claimed = await sql`
    select id, name, headline, looking_for, claimed_at, linkedin_url
    from attendees where claimed order by claimed_at desc
  `;
  const interests = await sql`
    select s.created_at,
           o.id as owner_id, o.name as owner_name, o.looking_for as owner_wants,
           t.id as saved_id, t.name as saved_name, t.headline as saved_headline,
           t.linkedin_url as saved_linkedin
    from saves s
    join attendees o on o.id = s.owner_id
    join attendees t on t.id = s.saved_id
    order by s.created_at desc
  `;
  const [{ count: total }] = await sql`select count(*)::int as count from attendees`;
  return NextResponse.json({ total, claimed, interests });
}
