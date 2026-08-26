import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { GET, PATCH, DELETE } from "./route";
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

  it("returns null marketingContent when none has been generated", async () => {
    const book = await prisma.book.create({
      data: { title: "Unrated", author: "A", priceCents: 1000 },
    });

    const response = await GET(new Request(`http://localhost/api/v1/books/${book.id}`), {
      params: Promise.resolve({ id: book.id }),
    });
    const body = await response.json();

    expect(body.data.marketingContent).toBeNull();
  });

  it("returns generated marketingContent when present", async () => {
    const book = await prisma.book.create({
      data: { title: "Promoted", author: "A", priceCents: 1000 },
    });
    await prisma.bookMarketingContent.create({
      data: {
        bookId: book.id,
        contentType: "promotional_description",
        headline: "A must-read",
        bodyCopy: "Discover Promoted by A.",
        reason: "Deterministic template",
        sourceFields: ["title", "author"],
      },
    });

    const response = await GET(new Request(`http://localhost/api/v1/books/${book.id}`), {
      params: Promise.resolve({ id: book.id }),
    });
    const body = await response.json();

    expect(body.data.marketingContent.headline).toBe("A must-read");
    expect(body.data.marketingContent.bodyCopy).toBe("Discover Promoted by A.");
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

describe("DELETE /api/v1/books/:id", () => {
  it("deletes a book along with its owned Inventory/BookMarketingContent rows", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Delete Me",
        author: "A",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 3, reorderThreshold: 2, status: "in_stock" } },
      },
    });
    await prisma.bookMarketingContent.create({
      data: {
        bookId: book.id,
        contentType: "promotional_description",
        headline: "Headline",
        bodyCopy: "Body",
        reason: "Template",
        sourceFields: ["title"],
      },
    });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/books/${book.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(response.status).toBe(200);

    expect(await prisma.book.findUnique({ where: { id: book.id } })).toBeNull();
    expect(await prisma.inventory.findUnique({ where: { bookId: book.id } })).toBeNull();
    expect(await prisma.bookMarketingContent.findUnique({ where: { bookId: book.id } })).toBeNull();
  });

  it("returns 409 when referenced by an existing order", async () => {
    const book = await prisma.book.create({
      data: { title: "Book", author: "A", priceCents: 1000 },
    });
    const customer = await prisma.customer.create({ data: { firstName: "Jane" } });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "placed",
        paymentStatus: "unpaid",
        totalCents: 1000,
      },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, bookId: book.id, quantity: 1, unitPriceCents: 1000 },
    });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/books/${book.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(response.status).toBe(409);

    expect(await prisma.book.findUnique({ where: { id: book.id } })).not.toBeNull();
  });

  it("returns 404 for an unknown book", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/v1/books/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const book = await prisma.book.create({
      data: { title: "Book", author: "A", priceCents: 1000 },
    });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/books/${book.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(response.status).toBe(401);
  });
});
