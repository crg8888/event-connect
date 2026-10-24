import { NextResponse } from "next/server";
import { getOrganizer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await getOrganizer();
  if (!org) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  return NextResponse.json(org);
}
