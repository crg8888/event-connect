import { NextResponse } from "next/server";
import { launchAgent, sendMessage } from "@/lib/omnara";
import { buildInstruction } from "@/lib/matchmaker";
import { sql } from "@/lib/db";

export const maxDuration = 60;

type Match = { id: number; name: string; why: string; icebreaker: string };
type PingOut = { recipientId: number; message: string };

function parseReply(raw: string): {
  reply: string;
  matches: Match[];
  pings: PingOut[];
} {
  try {
    const cleaned = raw.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      reply: String(parsed.reply ?? ""),
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      pings: Array.isArray(parsed.pings) ? parsed.pings : [],
    };
  } catch {
    return { reply: raw, matches: [], pings: [] };
  }
}

async function persistPings(senderId: number, pings: PingOut[]): Promise<PingOut[]> {
  if (!pings.length) return [];
  const results: PingOut[] = [];
  for (const p of pings) {
    const recipientId = Number(p.recipientId);
    const message = String(p.message ?? "").trim().slice(0, 300);
    if (!recipientId || !message || recipientId === senderId) continue;
    const [row] = await sql`
      select id from attendees where id = ${recipientId} and claimed
    `;
    if (!row) continue;
    await sql`
      insert into pings (sender_id, recipient_id, message)
      values (${senderId}, ${recipientId}, ${message})
    `;
    results.push({ recipientId, message });
  }
  return results;
}

export async function POST(req: Request) {
  const { question, attendeeId, agentId } = await req.json();

  const q = question;
  if (!q) return NextResponse.json({ error: "question required" }, { status: 400 });

  try {
    let raw: string;
    let finalAgentId: string;
    if (agentId) {
      raw = await sendMessage(agentId, q);
      finalAgentId = agentId;
    } else {
      const instruction = await buildInstruction(attendeeId ?? null);
      const launched = await launchAgent(
        instruction,
        q,
        `backchannel-${attendeeId ?? "guest"}-${Date.now()}`
      );
      finalAgentId = launched.agentId;
      raw = launched.reply;
    }
    const parsed = parseReply(raw);
    const persistedPings = attendeeId
      ? await persistPings(attendeeId, parsed.pings)
      : [];
    if (attendeeId) {
      await sql`
        update pings set read_at = now()
        where recipient_id = ${attendeeId} and read_at is null
      `.catch(() => {});

      await sql`
        insert into chat_messages (attendee_id, role, content, agent_id)
        values (${attendeeId}, 'user', ${JSON.stringify({ text: q })}, ${finalAgentId})
      `.catch(() => {});
      await sql`
        insert into chat_messages (attendee_id, role, content, agent_id)
        values (
          ${attendeeId},
          'agent',
          ${JSON.stringify({
            text: parsed.reply,
            matches: parsed.matches,
            pings: persistedPings,
          })},
          ${finalAgentId}
        )
      `.catch(() => {});
    }
    return NextResponse.json({
      agentId: finalAgentId,
      reply: parsed.reply,
      matches: parsed.matches,
      pings: persistedPings,
    });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json({ error: "Concierge hiccup. Try again." }, { status: 502 });
  }
}
