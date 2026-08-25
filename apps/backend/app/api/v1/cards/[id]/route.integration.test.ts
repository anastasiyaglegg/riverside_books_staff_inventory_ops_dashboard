import { describe, it, expect, beforeEach } from "vitest";

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/cards/[id]", () => {
  it("returns the card by id", async () => {
    const card = await prisma.card.create({
      data: { title: "Happy Birthday", priceCents: 550, occasion: "birthday" },
    });

    const response = await GET(new Request(`http://localhost/api/v1/cards/${card.id}`), {
      params: Promise.resolve({ id: card.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(card.id);
    expect(body.data.title).toBe("Happy Birthday");
  });

  it("returns 404 when the card does not exist", async () => {
    const response = await GET(
      new Request("http://localhost/api/v1/cards/00000000-0000-0000-0000-000000000000"),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );

    expect(response.status).toBe(404);
  });
});
