import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, so this file must NEVER be
// imported from /components or anywhere that ends up in the client bundle.
// (Next.js would refuse to inline a non-NEXT_PUBLIC_ var into client code anyway,
// but importing this module client-side is still a mistake to catch early.)
if (typeof window !== "undefined") {
  throw new Error("lib/supabase.ts is server-only. Do not import it from client components.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local.");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local (server-side only).");
}

let _client: SupabaseClient | null = null;

/** Lazily-created singleton server client, service role (bypasses RLS). */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl as string, serviceRoleKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
