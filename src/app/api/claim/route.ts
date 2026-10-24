import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { invalidateBackchannelCache } from "@/lib/backchannel";

export async function POST(req: Request) {
  const { attendeeId, email, lookingFor } = await req.json();
  if (!attendeeId || typeof email !== "string" || typeof lookingFor !== "string") {
    return NextResponse.json(
      { error: "attendeeId, email, and lookingFor required" },
      { status: 400 }
    );
  }

  const [row] = await sql`
    select id, email, claimed from attendees where id = ${attendeeId}
  `;
  if (!row) return NextResponse.json({ error: "Attendee not found." }, { status: 404 });
  if (row.claimed) {
    return NextResponse.json(
      { error: "This profile has already been claimed. Not you? Flag the host." },
      { status: 409 }
    );
  }
  if (!row.email || row.email.toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "That email doesn't match the one the host RSVP'd." },
      { status: 403 }
    );
  }

  const [claimed] = await sql`
    update attendees
    set claimed = true, looking_for = ${lookingFor.slice(0, 300)}, claimed_at = now()
    where id = ${attendeeId}
    returning id, name, looking_for, event_id
  `;
  if (claimed?.event_id) invalidateBackchannelCache(claimed.event_id);
  return NextResponse.json(claimed);
}
