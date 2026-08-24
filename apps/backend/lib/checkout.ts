import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export type CartItem = { bookId: string; quantity: number };

export type ResolvedCart = {
  // Stripe line items with amounts derived from Book.priceCents (never the client).
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  // OrderItem rows for persisting the order on fulfillment.
  orderItems: { bookId: string; quantity: number; unitPriceCents: number }[];
  totalCents: number;
};

/**
 * Turns a cart (book ids + quantities) into Stripe line items and Order items, pricing
 * everything server-side from the DB. Returns null if any book id doesn't exist so the
 * caller can reject the request rather than charge for a phantom item.
 */
export async function resolveCart(items: CartItem[]): Promise<ResolvedCart | null> {
  const books = await prisma.book.findMany({
    where: { id: { in: items.map((i) => i.bookId) } },
  });
  const byId = new Map(books.map((b) => [b.id, b]));
  if (items.some((item) => !byId.has(item.bookId))) {
    return null;
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const book = byId.get(item.bookId)!;
    return {
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: book.priceCents,
        product_data: { name: book.title, description: `by ${book.author}` },
      },
    };
  });

  const orderItems = items.map((item) => {
    const book = byId.get(item.bookId)!;
    return { bookId: item.bookId, quantity: item.quantity, unitPriceCents: book.priceCents };
  });
  const totalCents = orderItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  return { lineItems, orderItems, totalCents };
}
