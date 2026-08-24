import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/orders/:id", () => {
  it("returns a single order's detail, without auth", async () => {
    const customer = await prisma.customer.create({
      data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "placed",
        paymentStatus: "unpaid",
        totalCents: 1500,
      },
    });

    const response = await GET(new Request(`http://localhost/api/v1/orders/${order.id}`), {
      params: Promise.resolve({ id: order.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(order.id);
    expect(body.data.customer.firstName).toBe("Jane");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(new Request("http://localhost/api/v1/orders/missing"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(404);
  });
});
