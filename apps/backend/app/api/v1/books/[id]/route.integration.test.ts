import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { GET, PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("GET /api/v1/books/:id", () => {
  it("returns a single title with stock status", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Dune",
        author: "Frank Herbert",
        priceCents: 1800,
        inventory: { create: { quantityOnHand: 1, reorderThreshold: 2, status: "low_stock" } },
      },
    });

    const response = await GET(new Request(`http://localhost/api/v1/books/${book.id}`), {
      params: Promise.resolve({ id: book.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.inventory.status).toBe("low_stock");
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(new Request("http://localhost/api/v1/books/missing"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/books/:id", () => {
  it("edits title fields", async () => {
    const book = await prisma.book.create({
      data: { title: "Old Title", author: "A", priceCents: 1000 },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("Updated Title");
  });

  it("returns 400 for an empty update body", async () => {
    const book = await prisma.book.create({
      data: { title: "Title", author: "A", priceCents: 1000 },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const book = await prisma.book.create({
      data: { title: "Title", author: "A", priceCents: 1000 },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Nope" }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(response.status).toBe(401);
  });
});
