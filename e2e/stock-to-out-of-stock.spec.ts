import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import { loginAsStaff } from "./auth";

// Required flow (CLAUDE.md "Testing Rules"): staff zeroes stock -> dashboard
// shows Out of Stock.
test.describe("stock zeroed out shows Out of Stock", () => {
  let bookId: string;
  const title = `E2E Zero Stock ${Date.now()}`;

  test.beforeEach(async () => {
    const book = await prisma.book.create({
      data: {
        title,
        author: "E2E Author",
        priceCents: 1500,
        inventory: {
          create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" },
        },
      },
    });
    bookId = book.id;
  });

  test.afterEach(async () => {
    await prisma.inventory.deleteMany({ where: { bookId } });
    await prisma.book.delete({ where: { id: bookId } });
  });

  test("setting quantity to 0 flips the badge to Out of Stock", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/inventory");

    // The dev DB carries the repo's full "real store" seed data (200+ inventory
    // rows), so the first fetch+render after a fresh login takes longer than
    // Playwright's default 5s assertion timeout.
    const row = page.locator("tr", { hasText: title });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText("In Stock", { exact: true })).toBeVisible();

    await row.locator(".qty-input").fill("0");
    await row.getByRole("button", { name: "Save" }).click();

    await expect(row.getByText("Out of Stock", { exact: true })).toBeVisible();
  });
});
