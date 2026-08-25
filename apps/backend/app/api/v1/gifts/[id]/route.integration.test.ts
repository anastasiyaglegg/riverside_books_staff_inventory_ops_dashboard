import { describe, it, expect, beforeEach } from "vitest";

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
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
