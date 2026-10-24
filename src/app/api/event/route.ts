import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug");
  const [event] = slug
    ? await sql`select id, name, slug from events where slug = ${slug}`
    : await sql`select id, name, slug from events order by id limit 1`;
  return NextResponse.json(event ?? null);
}
