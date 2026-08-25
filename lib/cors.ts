import { NextResponse } from "next/server";

// Origins allowed to embed the widget cross-origin (e.g. the real storefront
// domain), comma-separated. Empty by default — same-origin requests (the demo
// page) don't need CORS headers at all, so nothing changes until this is set.
// Single source of truth shared by every API route the widget's components
// call — duplicating this parsing per-route risks the allowlist drifting.
const ALLOWED_ORIGINS = (process.env.CHAT_WIDGET_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): HeadersInit {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return {};
}

export function corsPreflight(request: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}
