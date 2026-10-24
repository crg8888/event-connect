import { NextResponse } from "next/server";
import { researchAttendee } from "@/lib/research";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { attendeeId } = await req.json();
  const id = Number(attendeeId);
  if (!id) return NextResponse.json({ error: "attendeeId required" }, { status: 400 });
  const done = await researchAttendee(id);
  return NextResponse.json({ researched: done });
}
