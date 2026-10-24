import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("attendeeId"));
  if (!id) return NextResponse.json({ error: "attendeeId required" }, { status: 400 });

  const [self] = await sql`
    select event_id from attendees where id = ${id}
  `;
  const eventId = self?.event_id ?? null;

  const rows = await sql`
    with my_event as (
      select ${eventId}::int as event_id
    ),
    others as (
      select a.id, a.name, a.headline, a.linkedin_url, a.looking_for,
             a.claimed, a.description
      from attendees a, my_event m
      where (m.event_id is null or a.event_id = m.event_id) and a.id <> ${id}
    ),
    latest as (
      select case when sender_id = ${id} then recipient_id else sender_id end as partner_id,
             max(id) as latest_id
      from pings
      where sender_id = ${id} or recipient_id = ${id}
      group by partner_id
    ),
    unread_from as (
      select sender_id as partner_id, count(*)::int as unread
      from pings
      where recipient_id = ${id} and read_at is null
      group by sender_id
    )
    select o.id, o.name, o.headline, o.linkedin_url, o.looking_for, o.claimed,
           pm.message as last_message,
           pm.created_at as last_at,
           coalesce(pm.sender_id = ${id}, false) as from_me,
           coalesce(uf.unread, 0)::int as unread
    from others o
    left join latest l on l.partner_id = o.id
    left join pings pm on pm.id = l.latest_id
    left join unread_from uf on uf.partner_id = o.id
    order by
      coalesce(uf.unread, 0) desc,
      pm.created_at desc nulls last,
      o.claimed desc,
      o.name asc
  `;

  return NextResponse.json({ threads: rows });
}
