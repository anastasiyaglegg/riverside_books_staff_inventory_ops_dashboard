import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/retrieval";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const parsed = limitParam ? Number(limitParam) : 3;
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;

  const events = await getUpcomingEvents(limit);
  return NextResponse.json({ results: events });
}
