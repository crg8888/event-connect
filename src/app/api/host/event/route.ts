import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const [event] = await sql`
    select id, name, luma_url, agenda, slug, agent_name, welcome_template
    from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  return NextResponse.json(event ?? null);
}

export async function POST(req: Request) {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { name, lumaUrl, agenda, agentName, welcomeTemplate } = await req.json();
  if (!name?.trim() || !agenda?.trim()) {
    return NextResponse.json({ error: "name and agenda required" }, { status: 400 });
  }
  const cleanAgentName = agentName?.trim() || "Hacky";
  const cleanWelcome = welcomeTemplate?.trim() || null;

  const [existing] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (existing) {
    const [event] = await sql`
      update events set
        name = ${name.trim()},
        luma_url = ${lumaUrl?.trim() || null},
        agenda = ${agenda.trim()},
        agent_name = ${cleanAgentName},
        welcome_template = ${cleanWelcome}
      where id = ${existing.id}
      returning id, name, agenda, slug, agent_name, welcome_template
    `;
    return NextResponse.json(event);
  }

  let slug = slugify(name) || "event";
  const taken = await sql`select 1 from events where slug = ${slug}`;
  if (taken.length) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const [event] = await sql`
    insert into events (name, luma_url, agenda, organizer_id, slug, agent_name, welcome_template)
    values (${name.trim()}, ${lumaUrl?.trim() || null}, ${agenda.trim()}, ${org.id}, ${slug},
            ${cleanAgentName}, ${cleanWelcome})
    returning id, name, agenda, slug, agent_name, welcome_template
  `;
  return NextResponse.json(event);
}
