import { describe, it, expect, beforeEach, vi } from "vitest";

const create = vi.fn();
const retrieve = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create, retrieve } } }),
  checkoutReturnUrl: () => "http://localhost:5173/checkout/return?session_id={CHECKOUT_SESSION_ID}",
}));

import { POST, GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

async function seedBook(priceCents: number) {
  return prisma.book.create({
    data: { title: "Test Book", author: "Tester", priceCents },
  });
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  create.mockResolvedValue({ id: "cs_test_123", client_secret: "cs_test_secret" });
});

describe("POST /api/v1/checkout/session", () => {
  it("creates an embedded session with server-priced line items", async () => {
    const book = await seedBook(1999);

    const response = await POST(
      new Request("http://localhost/api/v1/checkout/session", {
        method: "POST",
        body: JSON.stringify({ items: [{ bookId: book.id, quantity: 2 }] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.clientSecret).toBe("cs_test_secret");
    const [args] = create.mock.calls[0]!;
    expect(args.ui_mode).toBe("embedded_page");
    expect(args.payment_method_types).toBeUndefined(); // dynamic payment methods
    expect(args.line_items[0].price_data.unit_amount).toBe(1999); // from DB, not client
    expect(args.line_items[0].quantity).toBe(2);
  });

  it("prefills the email for a signed-in customer (checkout as user)", async () => {
    const book = await seedBook(1000);
    const customer = await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "ada@example.com" },
    });

    await POST(
      new Request("http://localhost/api/v1/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          items: [{ bookId: book.id, quantity: 1 }],
          customerId: customer.id,
        }),
      }),
    );

    const [args] = create.mock.calls[0]!;
    expect(args.customer_email).toBe("ada@example.com");
    expect(args.metadata.customerId).toBe(customer.id);
  });

  it("omits the email for a guest (no customerId)", async () => {
    const book = await seedBook(1000);
    await POST(
      new Request("http://localhost/api/v1/checkout/session", {
        method: "POST",
        body: JSON.stringify({ items: [{ bookId: book.id, quantity: 1 }] }),
      }),
    );
    const [args] = create.mock.calls[0]!;
    expect(args.customer_email).toBeUndefined();
    expect(args.metadata.customerId).toBe("");
  });

  it("rejects a cart referencing an unknown book", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/checkout/session", {
        method: "POST",
        body: JSON.stringify({
          items: [{ bookId: "00000000-0000-0000-0000-000000000000", quantity: 1 }],
        }),
      }),
    );
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty cart", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/checkout/session", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/checkout/session", () => {
  it("returns session status and the linked order id once fulfilled", async () => {
    const customer = await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "ada@example.com" },
    });
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: "placed",
        paymentStatus: "paid_online",
        totalCents: 1999,
        stripeSessionId: "cs_test_123",
      },
    });
    retrieve.mockResolvedValue({
      status: "complete",
      payment_status: "paid",
      customer_details: { email: "ada@example.com" },
    });

    const response = await GET(
      new Request("http://localhost/api/v1/checkout/session?session_id=cs_test_123"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("complete");
    expect(body.data.orderId).toBe(order.id);
  });

  it("returns 400 without a session_id", async () => {
    const response = await GET(new Request("http://localhost/api/v1/checkout/session"));
    expect(response.status).toBe(400);
  });
});
