import { NextResponse } from "next/server";
import { launchAgent, sendMessage } from "@/lib/omnara";
import { buildInstruction } from "@/lib/matchmaker";

export const maxDuration = 60;

type Match = { id: number; name: string; why: string; icebreaker: string };

function parseReply(raw: string): { reply: string; matches: Match[] } {
  try {
    const cleaned = raw.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return {
      reply: String(parsed.reply ?? ""),
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
    };
  } catch {
    return { reply: raw, matches: [] };
  }
}

export async function POST(req: Request) {
  const { question, attendeeId, agentId } = await req.json();

  const q = question;
  if (!q) return NextResponse.json({ error: "question required" }, { status: 400 });

  try {
    if (agentId) {
      const raw = await sendMessage(agentId, q);
      return NextResponse.json({ agentId, ...parseReply(raw) });
    }
    const instruction = await buildInstruction(attendeeId ?? null);
    const { agentId: newId, reply: raw } = await launchAgent(
      instruction,
      q,
      `backchannel-${attendeeId ?? "guest"}-${Date.now()}`
    );
    return NextResponse.json({ agentId: newId, ...parseReply(raw) });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json({ error: "Concierge hiccup. Try again." }, { status: 502 });
  }
}
