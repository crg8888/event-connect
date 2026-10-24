import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, sessionValue, sessionOptions, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Name, email, and a password of 8+ characters required." },
      { status: 400 }
    );
  }
  const cleanEmail = email.trim().toLowerCase();
  const existing = await sql`select id from organizers where email = ${cleanEmail}`;
  if (existing.length) {
    return NextResponse.json({ error: "Account exists. Log in instead." }, { status: 409 });
  }
  const hash = await hashPassword(password);
  const [org] = await sql`
    insert into organizers (name, email, password_hash)
    values (${name.trim()}, ${cleanEmail}, ${hash})
    returning id, name, email
  `;
  // first account adopts any pre-auth events so existing data keeps working
  await sql`update events set organizer_id = ${org.id} where organizer_id is null`;
  const res = NextResponse.json(org);
  res.cookies.set(SESSION_COOKIE, sessionValue(org.id), sessionOptions);
  return res;
}
