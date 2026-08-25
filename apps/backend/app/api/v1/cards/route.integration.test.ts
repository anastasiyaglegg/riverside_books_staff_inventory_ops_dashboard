import { describe, it, expect, beforeEach } from "vitest";

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/cards", () => {
  it("lists cards ordered by title", async () => {
    await prisma.card.create({
      data: { title: "With Sympathy", priceCents: 550, occasion: "sympathy" },
    });
    await prisma.card.create({
      data: { title: "Congratulations!", priceCents: 550, occasion: "congratulations" },
    });

    const response = await GET(new Request("http://localhost/api/v1/cards"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data.map((c: { title: string }) => c.title)).toEqual([
      "Congratulations!",
      "With Sympathy",
    ]);
  });

  it("filters by occasion", async () => {
    await prisma.card.create({
      data: { title: "Happy Birthday", priceCents: 550, occasion: "birthday" },
    });
    await prisma.card.create({
      data: { title: "Season's Readings", priceCents: 595, occasion: "holiday" },
    });

    const response = await GET(new Request("http://localhost/api/v1/cards?occasion=holiday"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("Season's Readings");
  });

  it("searches title and description with q", async () => {
    await prisma.card.create({
      data: { title: "Get Well Soon", priceCents: 495, description: "feel better" },
    });
    await prisma.card.create({
      data: { title: "Thank You", priceCents: 495, description: "floral design" },
    });

    const response = await GET(new Request("http://localhost/api/v1/cards?q=floral"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("Thank You");
  });

  it("omits meta and returns every match when page/limit are absent", async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.card.create({ data: { title: `Card ${i}`, priceCents: 500 } });
    }

    const response = await GET(new Request("http://localhost/api/v1/cards"));
    const body = await response.json();

    expect(body.data).toHaveLength(3);
    expect(body.meta).toBeUndefined();
  });

  it("paginates with page/limit and returns pagination meta", async () => {
    for (let i = 0; i < 25; i++) {
      await prisma.card.create({
        data: { title: `Card ${String(i).padStart(2, "0")}`, priceCents: 500 },
      });
    }

    const page1 = await (
      await GET(new Request("http://localhost/api/v1/cards?page=1&limit=20"))
    ).json();
    expect(page1.data).toHaveLength(20);
    expect(page1.data[0].title).toBe("Card 00");
    expect(page1.meta).toEqual({ page: 1, pageSize: 20, totalItems: 25, totalPages: 2 });

    const page2 = await (
      await GET(new Request("http://localhost/api/v1/cards?page=2&limit=20"))
    ).json();
    expect(page2.data).toHaveLength(5);
    expect(page2.meta).toEqual({ page: 2, pageSize: 20, totalItems: 25, totalPages: 2 });
  });

  it("returns 400 for an out-of-range limit", async () => {
    const response = await GET(new Request("http://localhost/api/v1/cards?limit=101"));
    expect(response.status).toBe(400);
  });
});
