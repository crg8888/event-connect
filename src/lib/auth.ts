import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { sql } from "./db";

const SECRET = process.env.SESSION_SECRET ?? "dev-only-secret";
export const SESSION_COOKIE = "bc_org";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function sessionValue(organizerId: number) {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  const payload = `${organizerId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export const sessionOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 24 * 3600,
};

export type Organizer = { id: number; name: string; email: string };

export async function getOrganizer(): Promise<Organizer | null> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const expected = sign(`${id}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  const [org] = await sql`select id, name, email from organizers where id = ${Number(id)}`;
  return (org as Organizer) ?? null;
}
