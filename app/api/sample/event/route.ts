import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { SamplePreviewAction } from "@/lib/types";

const VALID_ACTIONS: SamplePreviewAction[] = [
  "shown",
  "opened",
  "completed",
  "reserve_clicked",
  "dismissed",
];

interface Body {
  session_id?: string;
  book_id?: number;
  action?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.session_id || typeof body.session_id !== "string") {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }
  if (!body.action || !VALID_ACTIONS.includes(body.action as SamplePreviewAction)) {
    return NextResponse.json(
      { error: `action must be one of ${VALID_ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sample_preview_events").insert({
    session_id: body.session_id,
    book_id: body.book_id ?? null,
    action: body.action,
  });
  if (error) {
    console.error("Failed to write sample_preview_events row:", error);
    return NextResponse.json({ error: "failed to record event" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
