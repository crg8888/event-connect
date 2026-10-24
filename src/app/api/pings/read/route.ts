import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { recipientId } = await req.json();
  if (!recipientId)
    return NextResponse.json({ error: "recipientId required" }, { status: 400 });
  await sql`
    update pings set read_at = now()
    where recipient_id = ${recipientId} and read_at is null
  `;
  return NextResponse.json({ ok: true });
}
