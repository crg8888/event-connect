import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const attendees = await sql`
    select id, name, first_name, last_name, linkedin_url, headline, description,
           luma_bio, twitter, website, avatar_url, claimed, looking_for
    from attendees order by claimed desc, name asc
  `;
  return NextResponse.json(attendees);
}
