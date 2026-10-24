import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("attendeeId"));
  if (!id) return NextResponse.json({ error: "attendeeId required" }, { status: 400 });

  const rows = await sql`
    select id, role, content, agent_id, created_at
    from chat_messages
    where attendee_id = ${id}
    order by id asc
    limit 200
  `;
  const lastAgentId =
    [...rows].reverse().find((r) => r.agent_id)?.agent_id ?? null;
  return NextResponse.json({ messages: rows, latest_agent_id: lastAgentId });
}
