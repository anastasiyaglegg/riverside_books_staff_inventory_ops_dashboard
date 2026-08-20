import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("GET /api/v1/orders/:id", () => {
  it("returns a single order's detail", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Jane Doe", email: "jane@example.com" },
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
    expect(body.data.customer.name).toBe("Jane Doe");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(new Request("http://localhost/api/v1/orders/missing"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await GET(new Request("http://localhost/api/v1/orders/x"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(401);
  });
});
