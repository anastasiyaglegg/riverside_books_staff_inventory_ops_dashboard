import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  await prisma.staffUser.create({ data: { id: "staff-1", name: "Staff One", role: "owner" } });
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("PATCH /api/v1/inventory/:bookId", () => {
  it("adjusts quantity and recomputes status server-side", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Book",
        author: "A",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/inventory/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 0 }),
      }),
      { params: Promise.resolve({ bookId: book.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.quantityOnHand).toBe(0);
    expect(body.data.status).toBe("out_of_stock");
    expect(body.data.lastAdjustedById).toBe("staff-1");
    expect(body.data.lastAdjustedBy.name).toBe("Staff One");
  });

  it("returns 400 for a negative quantity", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Book",
        author: "A",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/inventory/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: -1 }),
      }),
      { params: Promise.resolve({ bookId: book.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when no inventory record exists for the book", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/inventory/missing", {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 1 }),
      }),
      { params: Promise.resolve({ bookId: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const book = await prisma.book.create({
      data: {
        title: "Book",
        author: "A",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/inventory/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 1 }),
      }),
      { params: Promise.resolve({ bookId: book.id }) },
    );
    expect(response.status).toBe(401);
  });
});
