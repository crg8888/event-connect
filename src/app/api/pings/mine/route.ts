import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const pings = await sql`
    select p.id, p.message, p.created_at, p.read_at,
           s.id as sender_id, s.name as sender_name,
           s.headline as sender_headline, s.linkedin_url as sender_linkedin,
           s.looking_for as sender_wants
    from pings p
    join attendees s on s.id = p.sender_id
    where p.recipient_id = ${id}
    order by p.created_at desc
    limit 50
  `;
  const unread = pings.filter((p) => !p.read_at).length;
  return NextResponse.json({ pings, unread });
}
