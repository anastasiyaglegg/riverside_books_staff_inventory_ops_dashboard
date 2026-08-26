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

describe("GET /api/v1/gifts", () => {
  it("lists gifts ordered by name", async () => {
    await prisma.gift.create({
      data: { name: "Zebra Mug", priceCents: 1495, category: "mug", quantityOnHand: 5 },
    });
    await prisma.gift.create({
      data: { name: "Apple Tote", priceCents: 1895, category: "tote", quantityOnHand: 3 },
    });

    const response = await GET(new Request("http://localhost/api/v1/gifts"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((g: { name: string }) => g.name)).toEqual(["Apple Tote", "Zebra Mug"]);
  });

  it("filters by category", async () => {
    await prisma.gift.create({ data: { name: "Enamel Mug", priceCents: 1495, category: "mug" } });
    await prisma.gift.create({ data: { name: "Canvas Tote", priceCents: 1895, category: "tote" } });

    const response = await GET(new Request("http://localhost/api/v1/gifts?category=tote"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Canvas Tote");
  });

  it("searches name and description with q", async () => {
    await prisma.gift.create({
      data: { name: "Reading Blanket", priceCents: 3995, description: "cozy and warm" },
    });
    await prisma.gift.create({
      data: { name: "Sticker Pack", priceCents: 599, description: "book nerd stickers" },
    });

    const response = await GET(new Request("http://localhost/api/v1/gifts?q=cozy"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Reading Blanket");
  });

  it("omits meta and returns every match when page/limit are absent", async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.gift.create({ data: { name: `Gift ${i}`, priceCents: 1000 } });
    }

    const response = await GET(new Request("http://localhost/api/v1/gifts"));
    const body = await response.json();

    expect(body.data).toHaveLength(3);
    expect(body.meta).toBeUndefined();
  });

  it("paginates with page/limit and returns pagination meta", async () => {
    for (let i = 0; i < 25; i++) {
      await prisma.gift.create({
        data: { name: `Gift ${String(i).padStart(2, "0")}`, priceCents: 1000 },
      });
    }

    const page1 = await (
      await GET(new Request("http://localhost/api/v1/gifts?page=1&limit=20"))
    ).json();
    expect(page1.data).toHaveLength(20);
    expect(page1.data[0].name).toBe("Gift 00");
    expect(page1.meta).toEqual({ page: 1, pageSize: 20, totalItems: 25, totalPages: 2 });

    const page2 = await (
      await GET(new Request("http://localhost/api/v1/gifts?page=2&limit=20"))
    ).json();
    expect(page2.data).toHaveLength(5);
    expect(page2.meta).toEqual({ page: 2, pageSize: 20, totalItems: 25, totalPages: 2 });
  });

  it("returns 400 for an out-of-range limit", async () => {
    const response = await GET(new Request("http://localhost/api/v1/gifts?limit=101"));
    expect(response.status).toBe(400);
  });
});

describe("POST /api/v1/gifts", () => {
  it("creates a gift", async () => {
    const request = new Request("http://localhost/api/v1/gifts", {
      method: "POST",
      body: JSON.stringify({
        name: "Reading Light",
        priceCents: 1295,
        category: "accessory",
        quantityOnHand: 12,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe("Reading Light");
    expect(body.data.quantityOnHand).toBe(12);
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request("http://localhost/api/v1/gifts", {
      method: "POST",
      body: JSON.stringify({ category: "mug" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });

    const request = new Request("http://localhost/api/v1/gifts", {
      method: "POST",
      body: JSON.stringify({ name: "X", priceCents: 100 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
