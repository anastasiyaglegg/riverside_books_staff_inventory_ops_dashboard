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

async function makeOrder(status: string) {
  const customer = await prisma.customer.create({
    data: { name: "Jane Doe", email: `${status}@example.com` },
  });
  return prisma.order.create({
    data: { customerId: customer.id, status, paymentStatus: "unpaid", totalCents: 1000 },
  });
}

describe("GET /api/v1/orders", () => {
  it("lists orders", async () => {
    await makeOrder("placed");
    await makeOrder("completed");

    const response = await GET(new Request("http://localhost/api/v1/orders"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("filters by status", async () => {
    await makeOrder("placed");
    await makeOrder("completed");

    const response = await GET(new Request("http://localhost/api/v1/orders?status=placed"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("placed");
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await GET(new Request("http://localhost/api/v1/orders"));
    expect(response.status).toBe(401);
  });
});
