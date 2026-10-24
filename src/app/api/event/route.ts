import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [event] = await sql`select id, name, luma_url, agenda from events order by id limit 1`;
  return NextResponse.json(event ?? null);
}

export async function POST(req: Request) {
  const { name, lumaUrl, agenda } = await req.json();
  if (!name || !agenda) {
    return NextResponse.json({ error: "name and agenda required" }, { status: 400 });
  }
  const existing = await sql`select id from events order by id limit 1`;
  if (existing.length) {
    const [event] = await sql`
      update events set name = ${name}, luma_url = ${lumaUrl ?? null}, agenda = ${agenda}
      where id = ${existing[0].id} returning id, name, agenda
    `;
    return NextResponse.json(event);
  }
  const [event] = await sql`
    insert into events (name, luma_url, agenda) values (${name}, ${lumaUrl ?? null}, ${agenda})
    returning id, name, agenda
  `;
  return NextResponse.json(event);
}
