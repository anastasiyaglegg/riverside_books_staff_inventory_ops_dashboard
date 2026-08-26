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

describe("PATCH /api/v1/cards/[id]", () => {
  it("restocks a card via quantityOnHand", async () => {
    const card = await prisma.card.create({
      data: { title: "Happy Birthday", priceCents: 550, occasion: "birthday", quantityOnHand: 1 },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 30 }),
      }),
      { params: Promise.resolve({ id: card.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.quantityOnHand).toBe(30);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const card = await prisma.card.create({ data: { title: "Card", priceCents: 500 } });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 5 }),
      }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when the body has no fields", async () => {
    const card = await prisma.card.create({ data: { title: "Card", priceCents: 500 } });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/cards/${card.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown card", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/cards/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        body: JSON.stringify({ quantityOnHand: 5 }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/v1/cards/[id]", () => {
  it("deletes a card with no order history", async () => {
    const card = await prisma.card.create({ data: { title: "Card", priceCents: 500 } });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/cards/${card.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(200);

    const found = await prisma.card.findUnique({ where: { id: card.id } });
    expect(found).toBeNull();
  });

  it("returns 409 when referenced by an existing order", async () => {
    const card = await prisma.card.create({ data: { title: "Card", priceCents: 500 } });
    const customer = await prisma.customer.create({ data: { firstName: "Jane" } });
    const order = await prisma.order.create({
      data: { customerId: customer.id, status: "placed", paymentStatus: "unpaid", totalCents: 500 },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, cardId: card.id, quantity: 1, unitPriceCents: 500 },
    });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/cards/${card.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(409);

    const found = await prisma.card.findUnique({ where: { id: card.id } });
    expect(found).not.toBeNull();
  });

  it("returns 404 for an unknown card", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/v1/cards/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const card = await prisma.card.create({ data: { title: "Card", priceCents: 500 } });

    const response = await DELETE(
      new Request(`http://localhost/api/v1/cards/${card.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: card.id }) },
    );
    expect(response.status).toBe(401);
  });
});
