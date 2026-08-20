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
    data: { name: "Jane Doe", email: "jane@example.com" },
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
});
