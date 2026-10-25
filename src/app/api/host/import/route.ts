import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { guests } = await req.json();
  if (!Array.isArray(guests)) {
    return NextResponse.json({ error: "guests array required" }, { status: 400 });
  }

  const [event] = await sql`
    select id from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ error: "Register your event first" }, { status: 400 });

  type GuestIn = { name?: string; email?: string; linkedin_url?: string | null };
  const clean: GuestIn[] = guests
    .map((g: GuestIn) => ({
      email: (g.email ?? "").toLowerCase().trim(),
      name: (g.name ?? "").trim(),
      linkedin_url: g.linkedin_url?.trim() || null,
    }))
    .filter((g) => g.email);

  for (const g of clean) {
    const em: string = g.email!;
    const [inEvent] = await sql`
      select id from attendees where lower(email) = ${em} and event_id = ${event.id}
    `;
    if (inEvent) {
      if (g.linkedin_url) {
        await sql`
          update attendees set linkedin_url = ${g.linkedin_url}
          where id = ${inEvent.id} and (linkedin_url is null or linkedin_url = '')
        `;
      }
      continue;
    }
    // pre-enriched profile bank — base bios survive event wipes
    const [prof] = await sql`
      select name, headline, description, linkedin_url
      from profiles where email = ${em}
    `;
    if (prof) {
      const nm = g.name || prof.name || em;
      const [pf, ...pr] = nm.split(/\s+/);
      await sql`
        insert into attendees (
          name, first_name, last_name, email, linkedin_url, headline,
          description, event_id, claimed
        ) values (
          ${nm}, ${pf}, ${pr.join(" ") || null}, ${em},
          ${g.linkedin_url ?? prof.linkedin_url ?? null},
          ${prof.headline}, ${prof.description}, ${event.id}, false
        )
      `;
      continue;
    }
    // same person at another event — copy their profile, never move them
    const [elsewhere] = await sql`
      select name, first_name, last_name, email, linkedin_url, headline,
             description, luma_bio, avatar_url, research, researched_at
      from attendees where lower(email) = ${em}
      order by researched_at desc nulls last limit 1
    `;
    if (elsewhere) {
      await sql`
        insert into attendees (
          name, first_name, last_name, email, linkedin_url, headline,
          description, luma_bio, avatar_url, research, researched_at,
          event_id, claimed
        ) values (
          ${elsewhere.name}, ${elsewhere.first_name}, ${elsewhere.last_name},
          ${elsewhere.email}, ${g.linkedin_url ?? elsewhere.linkedin_url},
          ${elsewhere.headline}, ${elsewhere.description}, ${elsewhere.luma_bio},
          ${elsewhere.avatar_url}, ${elsewhere.research}, ${elsewhere.researched_at},
          ${event.id}, false
        )
      `;
    } else {
      const [first, ...rest] = (g.name || em).split(/\s+/);
      await sql`
        insert into attendees (name, first_name, last_name, email, linkedin_url, event_id, claimed)
        values (${g.name || em}, ${first}, ${rest.join(" ") || null}, ${em}, ${g.linkedin_url ?? null}, ${event.id}, false)
      `;
    }
  }

  const matched = await sql`
    select id, name, email, linkedin_url, headline, description, luma_bio, avatar_url
    from attendees where event_id = ${event.id}
    order by name
  `;

  return NextResponse.json({
    total: guests.length,
    enriched: matched,
    linkedinCount: matched.filter((m) => m.linkedin_url).length,
  });
}
