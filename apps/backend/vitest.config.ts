import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL(".", import.meta.url)) };

export default defineConfig({
  resolve: { alias },
  test: {
    // Integration tests share one Postgres test DB; run all files serially so
    // one test's cleanup (beforeEach delete) can't race another's writes.
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["app/**/*.integration.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          // Writes to whatever DATABASE_URL currently points at -- run only via
          // `npm run verify:supabase`, never as part of unit/integration/CI.
          name: "supabase-lifecycle",
          include: ["scripts/**/*.supabase.test.ts"],
        },
      },
    ],
  },
});
