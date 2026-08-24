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

  it("defaults to page 1 with the default page size, and reports pagination meta", async () => {
    await makeBookWithInventory("in_stock", 5);
    await makeBookWithInventory("out_of_stock", 0);

    const response = await GET(new Request("http://localhost/api/v1/inventory"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, totalItems: 2, totalPages: 1 });
  });

  it("applies page and pageSize query params", async () => {
    await makeBookWithInventory("in_stock", 5);
    await makeBookWithInventory("low_stock", 1);
    await makeBookWithInventory("out_of_stock", 0);

    const response = await GET(new Request("http://localhost/api/v1/inventory?page=2&pageSize=2"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
  });

  it("returns an empty page past the last page, with accurate meta", async () => {
    await makeBookWithInventory("in_stock", 5);

    const response = await GET(new Request("http://localhost/api/v1/inventory?page=5&pageSize=20"));
    const body = await response.json();

    expect(body.data).toHaveLength(0);
    expect(body.meta).toEqual({ page: 5, pageSize: 20, totalItems: 1, totalPages: 1 });
  });

  it("clamps pageSize to the maximum allowed", async () => {
    await makeBookWithInventory("in_stock", 5);

    const response = await GET(new Request("http://localhost/api/v1/inventory?pageSize=500"));
    const body = await response.json();

    expect(body.meta.pageSize).toBe(100);
  });

  it("returns 400 for a non-positive page", async () => {
    const response = await GET(new Request("http://localhost/api/v1/inventory?page=0"));
    expect(response.status).toBe(400);
  });
});
