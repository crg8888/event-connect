import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getOrganizer } from "@/lib/auth";
import { generateOrganizerSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const [event] = await sql`
    select id, name, agenda, luma_url from events where organizer_id = ${org.id} order by id desc limit 1
  `;
  if (!event) return NextResponse.json({ error: "No event" }, { status: 400 });

  try {
    const suggestions = await generateOrganizerSuggestions({
      eventName: event.name,
      agenda: event.agenda,
      lumaUrl: event.luma_url,
    });
    await sql`
      update events set organizer_suggestions = ${JSON.stringify(suggestions)}::jsonb
      where id = ${event.id}
    `;
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("organizer suggestions error", e);
    return NextResponse.json({ error: "generation failed" }, { status: 502 });
  }
}
