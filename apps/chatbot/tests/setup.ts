import { config } from "dotenv";
import path from "node:path";

// Route handlers under test throw at import time if Supabase/Anthropic env
// vars are missing (see lib/supabase.ts, lib/claude.ts) — load .env.local
// before any test file imports them.
config({ path: path.resolve(__dirname, "..", ".env.local") });
