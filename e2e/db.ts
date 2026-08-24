import { PrismaClient } from "@prisma/client";

// Talks directly to the same dev Supabase Postgres the local backend dev
// server uses (apps/backend/.env.local) so seeded rows are immediately
// visible through the real API -- no mocking, matching the rest of this
// repo's "integration/E2E tests clean up their own data" rule.
export const prisma = new PrismaClient();
