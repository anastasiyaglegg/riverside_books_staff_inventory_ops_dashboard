import { NextResponse } from "next/server";
import { lookupByIsbn, searchCatalog } from "@/lib/retrieval";

// Raw retrieval, no LLM. Reused directly by Products A/B.
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn");
  const q = searchParams.get("q");

  if (isbn) {
    const result = await lookupByIsbn(isbn);
    return NextResponse.json({ results: result ? [result] : [] });
  }
  if (q) {
    const results = await searchCatalog(q, { limit: 10 });
    return NextResponse.json({ results });
  }
  return NextResponse.json({ error: "isbn or q query param required" }, { status: 400 });
}
