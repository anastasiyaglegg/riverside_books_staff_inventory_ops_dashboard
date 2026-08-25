import { NextResponse } from "next/server";
import { getStoreInfo } from "@/lib/retrieval";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import type { StoreInfoRow } from "@/lib/types";

const VALID_CATEGORIES: StoreInfoRow["category"][] = ["hours", "policy", "contact", "faq"];

export async function OPTIONS(request: Request): Promise<NextResponse> {
  return corsPreflight(request);
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const categories = category
    ? category
        .split(",")
        .map((c) => c.trim())
        .filter((c): c is StoreInfoRow["category"] =>
          VALID_CATEGORIES.includes(c as StoreInfoRow["category"])
        )
    : VALID_CATEGORIES;

  const rows = await getStoreInfo(categories);
  return NextResponse.json({ results: rows }, { headers: corsHeaders(request.headers.get("origin")) });
}
