import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyPassword, sessionValue, sessionOptions, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }
  const [org] = await sql`
    select id, name, email, password_hash from organizers where email = ${email.trim().toLowerCase()}
  `;
  if (!org || !(await verifyPassword(password, org.password_hash))) {
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  }
  const res = NextResponse.json({ id: org.id, name: org.name, email: org.email });
  res.cookies.set(SESSION_COOKIE, sessionValue(org.id), sessionOptions);
  return res;
}
