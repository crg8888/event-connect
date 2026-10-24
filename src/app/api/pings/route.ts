import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { senderId, recipientId, message } = await req.json();
  const sid = Number(senderId);
  const rid = Number(recipientId);
  const msg = String(message ?? "").trim().slice(0, 500);
  if (!sid || !rid || !msg || sid === rid) {
    return NextResponse.json(
      { error: "senderId, recipientId, and message required" },
      { status: 400 }
    );
  }
  const [row] = await sql`
    insert into pings (sender_id, recipient_id, message)
    values (${sid}, ${rid}, ${msg})
    returning id, created_at
  `;
  return NextResponse.json(row);
}
