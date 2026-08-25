// Base URL for Shalinthia's chatbot (Product C) API, deployed separately from
// this app. Empty until CHATBOT_API_URL is configured (its own Vercel deploy,
// pointed at the compat database) -- see CLAUDE.md. Requires her /api/* routes
// to send CORS headers for this app's origin; we asked her for that directly
// rather than editing her repo.
const CHAT_API_BASE = (import.meta.env.VITE_CHATBOT_API_URL ?? "").replace(/\/+$/, "");

export function chatApiUrl(path: string): string {
  return `${CHAT_API_BASE}${path}`;
}
