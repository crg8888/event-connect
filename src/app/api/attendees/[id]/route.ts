import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const [row] = await sql`
    select a.id, a.name, a.claimed, e.slug as event_slug, e.name as event_name
    from attendees a
    left join events e on e.id = a.event_id
    where a.id = ${id}
  `;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}
