// tsx scripts run outside Next.js, which normally loads .env.local for us.
// Import this first in any script that needs Supabase/Anthropic/etc. env vars.
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });
