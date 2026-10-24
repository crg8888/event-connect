import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const me = Number(u.searchParams.get("attendeeId"));
  const other = Number(u.searchParams.get("partnerId"));
  if (!me || !other)
    return NextResponse.json({ error: "attendeeId and partnerId required" }, { status: 400 });

  const [partner] = await sql`
    select id, name, headline, linkedin_url, looking_for from attendees where id = ${other}
  `;
  const messages = await sql`
    select id, sender_id, message, created_at, read_at
    from pings
    where (sender_id = ${me} and recipient_id = ${other})
       or (sender_id = ${other} and recipient_id = ${me})
    order by id asc
  `;
  // mark the ones TO me as read
  await sql`
    update pings set read_at = now()
    where recipient_id = ${me} and sender_id = ${other} and read_at is null
  `;
  return NextResponse.json({ partner, messages });
}
