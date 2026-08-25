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

describe("GET /api/v1/gifts/[id]", () => {
  it("returns the gift by id", async () => {
    const gift = await prisma.gift.create({
      data: { name: "Enamel Mug", priceCents: 1495, category: "mug", quantityOnHand: 5 },
    });

    const response = await GET(new Request(`http://localhost/api/v1/gifts/${gift.id}`), {
      params: Promise.resolve({ id: gift.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(gift.id);
    expect(body.data.name).toBe("Enamel Mug");
  });

  it("returns 404 when the gift does not exist", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/gifts/00000000-0000-0000-0000-000000000000"),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/gifts/[id]", () => {
  it("restocks a gift via quantityOnHand", async () => {
    const gift = await prisma.gift.create({
      data: { name: "Enamel Mug", priceCents: 1495, category: "mug", quantityOnHand: 2 },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/gifts/${gift.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 20 }),
      }),
      { params: Promise.resolve({ id: gift.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.quantityOnHand).toBe(20);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const gift = await prisma.gift.create({ data: { name: "Mug", priceCents: 1000 } });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/gifts/${gift.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 5 }),
      }),
      { params: Promise.resolve({ id: gift.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when the body has no fields", async () => {
    const gift = await prisma.gift.create({ data: { name: "Mug", priceCents: 1000 } });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/gifts/${gift.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: gift.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown gift", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/gifts/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 5 }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });
});
