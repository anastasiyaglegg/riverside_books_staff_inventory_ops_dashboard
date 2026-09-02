import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

async function makeOrder(status: string) {
  const customer = await prisma.customer.create({
    data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
  });
  return prisma.order.create({
    data: { customerId: customer.id, status, paymentStatus: "unpaid", totalCents: 1000 },
  });
}

describe("PATCH /api/v1/orders/:id/status", () => {
  it("transitions placed -> ready_for_pickup", async () => {
    const order = await makeOrder("placed");

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ready_for_pickup" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("ready_for_pickup");
  });

  it("rejects an invalid transition (placed -> completed)", async () => {
    const order = await makeOrder("placed");

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unrecognized status value", async () => {
    const order = await makeOrder("placed");

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "bogus" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown order", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/orders/missing/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const order = await makeOrder("placed");

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("awards one loyalty stamp when an order is completed", async () => {
    const customer = await prisma.customer.create({
      data: { firstName: "Loyal", lastName: "Reader", email: "loyal@example.com" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "ready_for_pickup",
        paymentStatus: "unpaid",
        totalCents: 1000,
      },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(200);

    const updated = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(updated?.loyaltyStampCount).toBe(1);
    const tx = await prisma.loyaltyTransaction.findFirst({ where: { customerId: customer.id } });
    expect(tx?.type).toBe("earn");
    expect(tx?.relatedOrderId).toBe(order.id);
  });

  it("does not double-earn a stamp when a paid_online order that already earned is completed", async () => {
    // Mirrors reality: the Stripe webhook already earned this order's stamp at payment time.
    const customer = await prisma.customer.create({
      data: {
        firstName: "Paid",
        lastName: "Reader",
        email: "paid@example.com",
        loyaltyStampCount: 1,
      },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "ready_for_pickup",
        paymentStatus: "paid_online",
        totalCents: 1000,
      },
    });
    await prisma.loyaltyTransaction.create({
      data: { customerId: customer.id, type: "earn", relatedOrderId: order.id },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(200);

    const updated = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(updated?.loyaltyStampCount).toBe(1); // unchanged -- no second stamp
    expect(await prisma.loyaltyTransaction.count({ where: { relatedOrderId: order.id } })).toBe(1);
  });

  it("restores reserved stock when an order is cancelled", async () => {
    // Book stock already reflects the reservation (5 on hand, 2 sold on this order).
    const book = await prisma.book.create({
      data: {
        title: "Reserved Book",
        author: "A. Author",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });
    const gift = await prisma.gift.create({
      data: { name: "Enamel Mug", priceCents: 1200, quantityOnHand: 4 },
    });
    const customer = await prisma.customer.create({
      data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "placed",
        paymentStatus: "unpaid",
        totalCents: 3200,
        items: {
          create: [
            { bookId: book.id, quantity: 2, unitPriceCents: 1000 },
            { giftId: gift.id, quantity: 1, unitPriceCents: 1200 },
          ],
        },
      },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );
    expect(response.status).toBe(200);

    const inventory = await prisma.inventory.findUnique({ where: { bookId: book.id } });
    expect(inventory?.quantityOnHand).toBe(7); // 5 + 2 restored
    expect((await prisma.gift.findUnique({ where: { id: gift.id } }))?.quantityOnHand).toBe(5); // 4 + 1
  });

  it("does not award a stamp when an order is cancelled", async () => {
    const customer = await prisma.customer.create({
      data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "placed",
        paymentStatus: "unpaid",
        totalCents: 1000,
      },
    });

    await PATCH(
      new Request(`http://localhost/api/v1/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: order.id }) },
    );

    const updated = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(updated?.loyaltyStampCount).toBe(0);
  });
});
