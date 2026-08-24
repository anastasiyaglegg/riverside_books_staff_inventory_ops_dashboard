import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// e2e/db.ts needs DATABASE_URL/DIRECT_URL to seed/clean up test data directly
// against the same dev Supabase project the backend dev server (below) uses.
loadEnv({ path: "apps/backend/.env.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev --workspace=apps/backend",
      url: "http://localhost:3000/api/v1/policies",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run dev --workspace=apps/staff-dashboard",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
