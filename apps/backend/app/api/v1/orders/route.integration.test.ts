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

async function makeOrder(status: string, customerId?: string) {
  const cid =
    customerId ??
    (
      await prisma.customer.create({
        data: {
          firstName: "Jane",
          lastName: "Doe",
          email: `${status}-${Date.now()}-${Math.random()}@example.com`,
        },
      })
    ).id;
  return prisma.order.create({
    data: { customerId: cid, status, paymentStatus: "unpaid", totalCents: 1000 },
  });
}

describe("GET /api/v1/orders", () => {
  it("lists orders (staff)", async () => {
    await makeOrder("placed");
    await makeOrder("completed");

    const response = await GET(new Request("http://localhost/api/v1/orders"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("filters by status (staff)", async () => {
    await makeOrder("placed");
    await makeOrder("completed");

    const response = await GET(new Request("http://localhost/api/v1/orders?status=placed"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("placed");
  });

  it("returns 401 when not authenticated as staff and no customerId given", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await GET(new Request("http://localhost/api/v1/orders"));
    expect(response.status).toBe(401);
  });

  it("returns just that customer's orders without auth when customerId is given", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const customer = await prisma.customer.create({
      data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });
    await makeOrder("placed", customer.id);
    await makeOrder("completed");

    const response = await GET(
      new Request(`http://localhost/api/v1/orders?customerId=${customer.id}`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].customerId).toBe(customer.id);
  });
});

describe("POST /api/v1/orders", () => {
  it("creates an order, finding or creating the customer by email", async () => {
    const book = await prisma.book.create({
      data: { title: "Test Book", author: "A. Author", priceCents: 1500 },
    });

    const request = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [{ bookId: book.id, quantity: 2 }],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe("placed");
    expect(body.data.totalCents).toBe(3000);
    expect(body.data.customer.email).toBe("jane@example.com");

    const customerCount = await prisma.customer.count();
    expect(customerCount).toBe(1);
  });

  it("reuses an existing customer with the same email instead of duplicating", async () => {
    const book = await prisma.book.create({
      data: { title: "Test Book", author: "A. Author", priceCents: 1000 },
    });
    const existing = await prisma.customer.create({
      data: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [{ bookId: book.id, quantity: 1 }],
        }),
      }),
    );
    const body = await response.json();

    expect(body.data.customerId).toBe(existing.id);
    expect(await prisma.customer.count()).toBe(1);
  });

  it("creates an order mixing a book, a gift, and a card, priced from each catalog", async () => {
    const book = await prisma.book.create({
      data: { title: "Test Book", author: "A. Author", priceCents: 1500 },
    });
    const gift = await prisma.gift.create({ data: { name: "Enamel Mug", priceCents: 1200 } });
    const card = await prisma.card.create({ data: { title: "Birthday Card", priceCents: 500 } });

    const response = await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [
            { bookId: book.id, quantity: 1 },
            { giftId: gift.id, quantity: 2 },
            { cardId: card.id, quantity: 3 },
          ],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    // 1500 + 2*1200 + 3*500 = 5400
    expect(body.data.totalCents).toBe(5400);
    expect(body.data.items).toHaveLength(3);
    const kinds = body.data.items.map(
      (i: { bookId: string | null; giftId: string | null; cardId: string | null }) =>
        i.bookId ? "book" : i.giftId ? "gift" : "card",
    );
    expect(kinds.sort()).toEqual(["book", "card", "gift"]);
  });

  it("returns 400 when a line references more than one product", async () => {
    const book = await prisma.book.create({
      data: { title: "Test Book", author: "A. Author", priceCents: 1500 },
    });
    const gift = await prisma.gift.create({ data: { name: "Enamel Mug", priceCents: 1200 } });

    const response = await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [{ bookId: book.id, giftId: gift.id, quantity: 1 }],
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when a referenced gift does not exist", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [{ giftId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when neither email nor phone is provided", async () => {
    const request = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({ customerName: "Jane Doe", items: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when a referenced book does not exist", async () => {
    const request = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [{ bookId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("decrements stock across books, gifts, and cards when the order is placed", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Stock Book",
        author: "A. Author",
        priceCents: 1500,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });
    const gift = await prisma.gift.create({
      data: { name: "Enamel Mug", priceCents: 1200, quantityOnHand: 10 },
    });
    const card = await prisma.card.create({
      data: { title: "Birthday Card", priceCents: 500, quantityOnHand: 8 },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [
            { bookId: book.id, quantity: 2 },
            { giftId: gift.id, quantity: 3 },
            { cardId: card.id, quantity: 1 },
          ],
        }),
      }),
    );
    expect(response.status).toBe(201);

    const inventory = await prisma.inventory.findUnique({ where: { bookId: book.id } });
    expect(inventory?.quantityOnHand).toBe(3); // 5 - 2
    expect(inventory?.status).toBe("in_stock");
    expect((await prisma.gift.findUnique({ where: { id: gift.id } }))?.quantityOnHand).toBe(7); // 10 - 3
    expect((await prisma.card.findUnique({ where: { id: card.id } }))?.quantityOnHand).toBe(7); // 8 - 1
  });

  it("recomputes book stock status to low/out when a sale crosses the threshold", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Almost Gone",
        author: "A. Author",
        priceCents: 1000,
        inventory: { create: { quantityOnHand: 3, reorderThreshold: 2, status: "in_stock" } },
      },
    });

    await POST(
      new Request("http://localhost/api/v1/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          items: [{ bookId: book.id, quantity: 3 }],
        }),
      }),
    );

    const inventory = await prisma.inventory.findUnique({ where: { bookId: book.id } });
    expect(inventory?.quantityOnHand).toBe(0);
    expect(inventory?.status).toBe("out_of_stock");
  });
});
