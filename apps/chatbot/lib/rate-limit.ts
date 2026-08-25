import { getSupabaseAdmin } from "./supabase";

// Session limit (20/min) is enforced via a DB query against chat_logs —
// correct even across serverless instances. IP limit (200/day) is best-effort
// in-memory: resets per cold start and doesn't coordinate across concurrent
// Vercel instances. Documented limitation (see CLAUDE.md); a durable version
// would need a shared store (e.g. Upstash Redis), out of scope for the locked
// stack on a free-tier budget.
const ipRequestLog = new Map<string, number[]>();

const SESSION_LIMIT_PER_MINUTE = 20;
const IP_LIMIT_PER_DAY = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkSessionRateLimit(sessionId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from("chat_logs")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .gte("created_at", oneMinuteAgo);

  if (error) {
    console.error("Session rate limit check failed, failing open:", error);
    return true;
  }
  return (count ?? 0) < SESSION_LIMIT_PER_MINUTE;
}

export function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestLog.get(ip) ?? []).filter((t) => now - t < DAY_MS);
  ipRequestLog.set(ip, timestamps);
  return timestamps.length < IP_LIMIT_PER_DAY;
}

export function recordIpRequest(ip: string): void {
  const now = Date.now();
  const timestamps = ipRequestLog.get(ip) ?? [];
  timestamps.push(now);
  ipRequestLog.set(ip, timestamps);
}
