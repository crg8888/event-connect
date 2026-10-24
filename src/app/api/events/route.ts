import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const events = await sql`
    select slug, name from events where slug is not null order by id desc limit 20
  `;
  return NextResponse.json(events);
}
