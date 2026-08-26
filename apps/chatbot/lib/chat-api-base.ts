// Client-side base URL for this app's own API routes ("use client" components
// only — process.env.NEXT_PUBLIC_* is inlined into the bundle at build time).
// Empty string resolves to same-origin, identical to before this existed. Set
// NEXT_PUBLIC_CHAT_API_BASE_URL when these components are embedded on a host
// page served from a different origin than the one hosting the API routes
// (see README "Embedding on another site").
export const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || "";
