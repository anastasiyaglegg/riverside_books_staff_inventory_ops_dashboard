import { test, expect } from "@playwright/test";
import { prisma } from "./db";
import { loginAsStaff } from "./auth";

// Required flow (CLAUDE.md "Testing Rules"): staff advances a pre-order to
// Ready for Pickup -> status updates.
test.describe("advancing a pre-order to Ready for Pickup", () => {
  let orderId: string;
  let customerId: string;
  let bookId: string;
  const customerName = `E2E Customer ${Date.now()}`;

  test.beforeEach(async () => {
    const book = await prisma.book.create({
      data: { title: "E2E Order Book", author: "E2E Author", priceCents: 1200 },
    });
    bookId = book.id;

    const customer = await prisma.customer.create({
      data: { firstName: customerName, email: `${Date.now()}@e2e.test` },
    });
    customerId = customer.id;

    const order = await prisma.order.create({
      data: {
        customerId,
        status: "placed",
        paymentStatus: "pay_in_store",
        totalCents: 1200,
        items: { create: [{ bookId, quantity: 1, unitPriceCents: 1200 }] },
      },
    });
    orderId = order.id;
  });

  test.afterEach(async () => {
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.book.delete({ where: { id: bookId } });
  });

  test("marking an order Ready for Pickup updates its status badge", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/orders");

    const row = page.locator("tr", { hasText: customerName });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText("Placed", { exact: true })).toBeVisible();

    await row.getByRole("button", { name: "Mark Ready for Pickup" }).click();

    await expect(row.getByText("Ready for Pickup", { exact: true })).toBeVisible();
  });
});
