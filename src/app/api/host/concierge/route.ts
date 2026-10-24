import { NextResponse } from "next/server";
import { launchAgent, sendMessage } from "@/lib/omnara";
import { buildOrganizerInstruction } from "@/lib/organizer-matchmaker";
import { getOrganizer } from "@/lib/auth";
import { sql } from "@/lib/db";

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
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { question, agentId } = await req.json();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  void sql`
    insert into host_messages (event_id, role, content)
    select id, 'host', ${String(question).slice(0, 500)}
    from events where organizer_id = ${org.id}
    order by id desc limit 1
  `.catch(() => {});

  try {
    if (agentId) {
      const raw = await sendMessage(agentId, question);
      return NextResponse.json({ agentId, ...parseReply(raw) });
    }
    const instruction = await buildOrganizerInstruction(org.id);
    const { agentId: newId, reply: raw } = await launchAgent(
      instruction,
      question,
      `envoy-organizer-${org.id}-${Date.now()}`
    );
    return NextResponse.json({ agentId: newId, ...parseReply(raw) });
  } catch (e) {
    console.error("organizer chat error", e);
    return NextResponse.json(
      { error: "Concierge hiccup. Try again." },
      { status: 502 }
    );
  }
}
