import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("e");
  const attendees = slug
    ? await sql`
        select a.id, a.name, a.first_name, a.last_name, a.linkedin_url, a.headline, a.description,
               a.luma_bio, a.twitter, a.website, a.avatar_url, a.claimed, a.looking_for
        from attendees a join events e on e.id = a.event_id
        where e.slug = ${slug}
        order by a.claimed desc, a.name asc
      `
    : await sql`
        select id, name, first_name, last_name, linkedin_url, headline, description,
               luma_bio, twitter, website, avatar_url, claimed, looking_for
        from attendees order by claimed desc, name asc
      `;
  return NextResponse.json(attendees);
}
