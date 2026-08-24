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
};
