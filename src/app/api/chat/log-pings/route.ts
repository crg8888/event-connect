import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { attendeeId, pingIds } = await req.json();
  if (!attendeeId || !Array.isArray(pingIds) || !pingIds.length) {
    return NextResponse.json({ ok: true });
  }

  const pings = await sql`
    select p.id, p.message, p.created_at,
           s.id as sender_id, s.name as sender_name,
           s.headline as sender_headline, s.linkedin_url as sender_linkedin,
           s.looking_for as sender_wants
    from pings p
    join attendees s on s.id = p.sender_id
    where p.id = any(${pingIds}) and p.recipient_id = ${attendeeId}
  `;

  for (const p of pings) {
    const already = await sql`
      select 1 from chat_messages
      where attendee_id = ${attendeeId}
        and role = 'ping'
        and (content->>'id')::int = ${p.id}
      limit 1
    `;
    if (already.length) continue;
    await sql`
      insert into chat_messages (attendee_id, role, content)
      values (${attendeeId}, 'ping', ${JSON.stringify(p)}::jsonb)
    `;
  }

  await sql`
    update pings set read_at = now()
    where id = any(${pingIds}) and recipient_id = ${attendeeId} and read_at is null
  `;
  return NextResponse.json({ ok: true });
}
