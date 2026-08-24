import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const constructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ webhooks: { constructEvent } }),
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

function completedEvent(session: Record<string, unknown>) {
  return { type: "checkout.session.completed", data: { object: session } };
}

function webhookRequest() {
  return new Request("http://localhost/api/v1/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "raw",
  });
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

afterEach(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe("POST /api/v1/webhooks/stripe", () => {
  it("creates a paid order from a completed checkout session", async () => {
    const book = await prisma.book.create({
      data: { title: "Paid Book", author: "Tester", priceCents: 1500 },
    });
    const customer = await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "ada@example.com" },
    });
    constructEvent.mockReturnValue(
      completedEvent({
        id: "cs_paid_1",
        payment_status: "paid",
        metadata: {
          items: JSON.stringify([{ bookId: book.id, quantity: 2 }]),
          customerId: customer.id,
        },
      }),
    );

    const response = await POST(webhookRequest());
    expect(response.status).toBe(200);

    const order = await prisma.order.findUnique({
      where: { stripeSessionId: "cs_paid_1" },
      include: { items: true },
    });
    expect(order?.paymentStatus).toBe("paid_online");
    expect(order?.customerId).toBe(customer.id);
    expect(order?.totalCents).toBe(3000);
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]?.unitPriceCents).toBe(1500);
  });

  it("fulfills an order containing a gift and a card", async () => {
    const gift = await prisma.gift.create({ data: { name: "Enamel Mug", priceCents: 1200 } });
    const card = await prisma.card.create({ data: { title: "Birthday Card", priceCents: 500 } });
    const customer = await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "ada@example.com" },
    });
    constructEvent.mockReturnValue(
      completedEvent({
        id: "cs_paid_giftcard",
        payment_status: "paid",
        metadata: {
          items: JSON.stringify([
            { giftId: gift.id, quantity: 2 },
            { cardId: card.id, quantity: 1 },
          ]),
          customerId: customer.id,
        },
      }),
    );

    await POST(webhookRequest());

    const order = await prisma.order.findUnique({
      where: { stripeSessionId: "cs_paid_giftcard" },
      include: { items: true },
    });
    expect(order?.paymentStatus).toBe("paid_online");
    // 2*1200 + 1*500 = 2900
    expect(order?.totalCents).toBe(2900);
    expect(order?.items).toHaveLength(2);
    expect(order?.items.find((i) => i.giftId === gift.id)?.quantity).toBe(2);
    expect(order?.items.find((i) => i.cardId === card.id)?.quantity).toBe(1);
  });

  it("is idempotent -- a repeated event does not create a second order", async () => {
    const book = await prisma.book.create({
      data: { title: "Paid Book", author: "Tester", priceCents: 1500 },
    });
    const customer = await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "ada@example.com" },
    });
    constructEvent.mockReturnValue(
      completedEvent({
        id: "cs_paid_2",
        payment_status: "paid",
        metadata: {
          items: JSON.stringify([{ bookId: book.id, quantity: 1 }]),
          customerId: customer.id,
        },
      }),
    );

    await POST(webhookRequest());
    await POST(webhookRequest());

    const orders = await prisma.order.findMany({ where: { stripeSessionId: "cs_paid_2" } });
    expect(orders).toHaveLength(1);
  });

  it("find-or-creates a guest customer from Stripe-collected details when no id is given", async () => {
    const book = await prisma.book.create({
      data: { title: "Paid Book", author: "Tester", priceCents: 1000 },
    });
    constructEvent.mockReturnValue(
      completedEvent({
        id: "cs_paid_3",
        payment_status: "paid",
        customer_details: { email: "guest@example.com", name: "Guest Buyer" },
        metadata: { items: JSON.stringify([{ bookId: book.id, quantity: 1 }]), customerId: "" },
      }),
    );

    await POST(webhookRequest());

    const customer = await prisma.customer.findUnique({ where: { email: "guest@example.com" } });
    expect(customer?.firstName).toBe("Guest");
    expect(customer?.lastName).toBe("Buyer");
  });

  it("does not fulfill an unpaid session", async () => {
    constructEvent.mockReturnValue(
      completedEvent({ id: "cs_unpaid", payment_status: "unpaid", metadata: { items: "[]" } }),
    );
    await POST(webhookRequest());
    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects an invalid signature with 400", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const response = await POST(webhookRequest());
    expect(response.status).toBe(400);
  });
});
