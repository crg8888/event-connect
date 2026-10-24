import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ownerId = new URL(req.url).searchParams.get("ownerId");
  if (!ownerId) return NextResponse.json([], { status: 200 });
  const rows = await sql`
    select a.id, a.name, a.headline, a.description, a.luma_bio, a.linkedin_url,
           a.avatar_url, a.claimed, a.looking_for, s.created_at as saved_at
    from saves s join attendees a on a.id = s.saved_id
    where s.owner_id = ${ownerId}
    order by s.created_at desc
  `;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const { ownerId, savedId } = await req.json();
  if (!ownerId || !savedId) {
    return NextResponse.json({ error: "ownerId and savedId required" }, { status: 400 });
  }
  await sql`
    insert into saves (owner_id, saved_id) values (${ownerId}, ${savedId})
    on conflict (owner_id, saved_id) do nothing
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { ownerId, savedId } = await req.json();
  await sql`delete from saves where owner_id = ${ownerId} and saved_id = ${savedId}`;
  return NextResponse.json({ ok: true });
}
