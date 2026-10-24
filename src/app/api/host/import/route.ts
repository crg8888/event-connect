import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { guests } = await req.json();
  if (!Array.isArray(guests)) {
    return NextResponse.json({ error: "guests array required" }, { status: 400 });
  }

  const emails = guests
    .map((g: { email?: string }) => (g.email ?? "").toLowerCase().trim())
    .filter(Boolean);

  const matched = await sql`
    select id, name, email, linkedin_url, headline, description, luma_bio, avatar_url
    from attendees
    where lower(email) = any(${emails})
    order by name
  `;

  return NextResponse.json({
    total: guests.length,
    enriched: matched,
    linkedinCount: matched.filter((m) => m.linkedin_url).length,
  });
}
