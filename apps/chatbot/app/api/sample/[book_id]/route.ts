import { NextResponse } from "next/server";
import { getSample } from "@/lib/retrieval";
import { corsHeaders, corsPreflight } from "@/lib/cors";

export async function OPTIONS(request: Request): Promise<NextResponse> {
  return corsPreflight(request);
}

export async function GET(
  request: Request,
  { params }: { params: { book_id: string } }
): Promise<NextResponse> {
  const cors = corsHeaders(request.headers.get("origin"));

  const bookId = Number(params.book_id);
  if (!Number.isInteger(bookId)) {
    return NextResponse.json({ error: "invalid book_id" }, { status: 400, headers: cors });
  }
  const sample = await getSample(bookId);
  if (!sample) {
    return NextResponse.json({ error: "no active sample" }, { status: 404, headers: cors });
  }
  return NextResponse.json(sample, { headers: cors });
}
