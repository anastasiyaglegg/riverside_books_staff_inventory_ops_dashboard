import { NextResponse, type NextRequest } from "next/server";

// The dashboard (and eventually the other three frontends) call this API
// cross-origin -- no cookies are used (auth is a Bearer token), so an open
// Allow-Origin is safe here; set CORS_ALLOWED_ORIGIN to lock it down per env.
const ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN ?? "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/v1/:path*",
  // Default (Edge) runtime bundles every matched route's dependency graph
  // into one script, which pulled in firebase-admin (via lib/firebase-admin.ts,
  // used by /customers/me) and crashed on load for every /api/v1/* request --
  // not just the Firebase one. Node.js runtime avoids that shared-bundle trap.
  runtime: "nodejs",
};
