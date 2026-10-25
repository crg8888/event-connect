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

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const rows = await sql`
    select m.role, m.content, m.agent_id
    from host_messages m
    join events e on e.id = m.event_id
    where e.organizer_id = ${org.id}
    order by m.id asc
    limit 100
  `;
  const messages = rows.map((r) => {
    if (r.role === "host") return { role: "user", text: r.content, matches: [] };
    try {
      const parsed = JSON.parse(r.content);
      return {
        role: "agent",
        text: String(parsed.reply ?? ""),
        matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      };
    } catch {
      return { role: "agent", text: r.content, matches: [] };
    }
  });
  const latestAgentId =
    [...rows].reverse().find((r) => r.agent_id)?.agent_id ?? null;
  return NextResponse.json({ messages, latest_agent_id: latestAgentId });
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
  // a host ask is a scoring signal (live priorities may have changed)
  void sql`
    update events set feed_scored_at = null where organizer_id = ${org.id}
  `.catch(() => {});

  try {
    let raw: string;
    let finalAgentId: string;
    if (agentId) {
      raw = await sendMessage(agentId, question);
      finalAgentId = agentId;
    } else {
      const instruction = await buildOrganizerInstruction(org.id);
      const launched = await launchAgent(
        instruction,
        question,
        `envoy-organizer-${org.id}-${Date.now()}`
      );
      finalAgentId = launched.agentId;
      raw = launched.reply;
    }
    const parsed = parseReply(raw);
    void sql`
      insert into host_messages (event_id, role, content, agent_id)
      select id, 'agent', ${JSON.stringify(parsed)}, ${finalAgentId}
      from events where organizer_id = ${org.id}
      order by id desc limit 1
    `.catch(() => {});
    return NextResponse.json({ agentId: finalAgentId, ...parsed });
  } catch (e) {
    console.error("organizer chat error", e);
    return NextResponse.json(
      { error: "Concierge hiccup. Try again." },
      { status: 502 }
    );
  }
}
