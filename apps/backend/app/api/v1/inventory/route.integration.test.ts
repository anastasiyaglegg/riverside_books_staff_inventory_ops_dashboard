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

async function makeBookWithInventory(status: string, quantityOnHand: number) {
  return prisma.book.create({
    data: {
      title: `Book ${status}`,
      author: "A",
      priceCents: 1000,
      inventory: { create: { quantityOnHand, reorderThreshold: 2, status } },
    },
    include: { inventory: true },
  });
}

describe("GET /api/v1/inventory", () => {
  it("returns the full inventory view", async () => {
    await makeBookWithInventory("in_stock", 5);
    await makeBookWithInventory("out_of_stock", 0);

    const response = await GET(new Request("http://localhost/api/v1/inventory"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("filters by status", async () => {
    await makeBookWithInventory("in_stock", 5);
    await makeBookWithInventory("out_of_stock", 0);

    const response = await GET(
      new Request("http://localhost/api/v1/inventory?status=out_of_stock"),
    );
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("out_of_stock");
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await GET(new Request("http://localhost/api/v1/inventory"));
    expect(response.status).toBe(401);
  });
});
