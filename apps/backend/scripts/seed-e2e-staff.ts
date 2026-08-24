// Creates (or refreshes) the Supabase Auth staff user + matching StaffUser row
// that the root-level Playwright E2E suite (../../e2e) logs in as. Run against
// the same dev Supabase project apps/backend/.env.local already points at:
//
//   npx dotenv -e .env.local -- tsx scripts/seed-e2e-staff.ts
//
// Idempotent -- safe to re-run any time the test user needs to be recreated.
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const EMAIL = "e2e-staff@riverside-books.test";
const PASSWORD = "E2eTestStaff!2026";

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  const admin = createClient(url, serviceRoleKey);
  const prisma = new PrismaClient();

  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list.users.find((u) => u.email === EMAIL);
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create Supabase Auth user");
  }

  await prisma.staffUser.upsert({
    where: { id: data.user.id },
    update: {},
    create: { id: data.user.id, name: "E2E Test Staff", role: "bookseller" },
  });

  console.log(`Seeded E2E staff user: ${EMAIL} (id ${data.user.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
