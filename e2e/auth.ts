import type { Page } from "@playwright/test";

// A real Supabase Auth staff user + matching StaffUser row, seeded once via
// scripts/seed-e2e-staff.ts against the dev Supabase project the local
// dashboard/backend dev servers already point at (apps/*/​.env.local).
export const E2E_STAFF_EMAIL = "e2e-staff@riverside-books.test";
export const E2E_STAFF_PASSWORD = "E2eTestStaff!2026";

export async function loginAsStaff(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_STAFF_EMAIL);
  await page.getByLabel("Password").fill(E2E_STAFF_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/inventory");
}
