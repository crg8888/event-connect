import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateAttendeeSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [attendee] = await sql`
    select a.id, a.name, a.headline, a.description, a.luma_bio, a.looking_for,
           a.chat_suggestions,
           e.name as event_name, e.agenda
    from attendees a
    left join events e on e.id = a.event_id
    where a.id = ${id}
  `;
  if (!attendee) return NextResponse.json({ error: "not found" }, { status: 404 });

  let existing = attendee.chat_suggestions;
  if (typeof existing === "string") {
    try {
      existing = JSON.parse(existing);
    } catch {
      existing = null;
    }
  }
  if (Array.isArray(existing) && existing.length) {
    return NextResponse.json({ suggestions: existing });
  }

  try {
    const suggestions = await generateAttendeeSuggestions({
      eventName: attendee.event_name ?? "the event",
      agenda: attendee.agenda ?? "",
      attendeeName: attendee.name,
      headline: attendee.headline,
      description: attendee.description ?? attendee.luma_bio,
      lookingFor: attendee.looking_for,
    });
    await sql`
      update attendees set chat_suggestions = ${JSON.stringify(suggestions)}
      where id = ${id}
    `;
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("attendee suggestions error", e);
    return NextResponse.json({ suggestions: [] });
  }
}
