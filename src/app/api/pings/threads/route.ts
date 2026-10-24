import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("attendeeId"));
  if (!id) return NextResponse.json({ error: "attendeeId required" }, { status: 400 });

  // All attendees we've exchanged a ping with (either direction), plus the
  // most recent message in that thread and the unread-from-them count.
  const rows = await sql`
    with partners as (
      select case when sender_id = ${id} then recipient_id else sender_id end as partner_id,
             max(id) as latest_id
      from pings
      where sender_id = ${id} or recipient_id = ${id}
      group by partner_id
    )
    select p.partner_id as id,
           a.name,
           a.headline,
           a.linkedin_url,
           a.looking_for,
           pm.message as last_message,
           pm.created_at as last_at,
           pm.sender_id = ${id} as from_me,
           (select count(*)::int from pings u
            where u.sender_id = p.partner_id
              and u.recipient_id = ${id}
              and u.read_at is null) as unread
    from partners p
    join attendees a on a.id = p.partner_id
    join pings pm on pm.id = p.latest_id
    order by pm.created_at desc
  `;
  return NextResponse.json({ threads: rows });
}
