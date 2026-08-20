import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("GET /api/v1/books", () => {
  it("lists books joined with inventory status", async () => {
    const book = await prisma.book.create({
      data: {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        priceCents: 1500,
        category: "fiction",
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });

    const request = new Request("http://localhost/api/v1/books");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(book.id);
    expect(body.data[0].inventory.status).toBe("in_stock");
  });

  it("filters by category", async () => {
    await prisma.book.create({
      data: { title: "Fiction Book", author: "A", priceCents: 1000, category: "fiction" },
    });
    await prisma.book.create({
      data: { title: "Mystery Book", author: "B", priceCents: 1000, category: "mystery" },
    });

    const request = new Request("http://localhost/api/v1/books?category=mystery");
    const response = await GET(request);
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("Mystery Book");
  });
});

describe("POST /api/v1/books", () => {
  it("creates a book and its inventory row", async () => {
    const request = new Request("http://localhost/api/v1/books", {
      method: "POST",
      body: JSON.stringify({
        title: "New Title",
        author: "New Author",
        priceCents: 2000,
        quantityOnHand: 3,
        reorderThreshold: 1,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.title).toBe("New Title");
    expect(body.data.inventory.quantityOnHand).toBe(3);
    expect(body.data.inventory.status).toBe("in_stock");
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request("http://localhost/api/v1/books", {
      method: "POST",
      body: JSON.stringify({ title: "Missing Author" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });

    const request = new Request("http://localhost/api/v1/books", {
      method: "POST",
      body: JSON.stringify({ title: "X", author: "Y", priceCents: 100 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
