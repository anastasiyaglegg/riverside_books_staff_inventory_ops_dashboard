import { NextResponse } from "next/server";
import { getSample } from "@/lib/retrieval";

export async function GET(
  _request: Request,
  { params }: { params: { book_id: string } }
): Promise<NextResponse> {
  const bookId = Number(params.book_id);
  if (!Number.isInteger(bookId)) {
    return NextResponse.json({ error: "invalid book_id" }, { status: 400 });
  }
  const sample = await getSample(bookId);
  if (!sample) {
    return NextResponse.json({ error: "no active sample" }, { status: 404 });
  }
  return NextResponse.json(sample);
}
