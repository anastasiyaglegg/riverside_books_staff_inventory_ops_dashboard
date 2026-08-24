import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

// A cart line references exactly one product from one of the three catalogs. Callers
// (POST /orders, POST /checkout/session) pass exactly one id; the Zod schema enforces
// that, and resolveCart rejects anything malformed or unknown.
export type CartItem = {
  bookId?: string;
  giftId?: string;
  cardId?: string;
  quantity: number;
};

// The persisted OrderItem shape -- exactly one product FK is set, mirroring CartItem.
export type ResolvedOrderItem = {
  bookId?: string;
  giftId?: string;
  cardId?: string;
  quantity: number;
  unitPriceCents: number;
};

export type ResolvedCart = {
  // Stripe line items with amounts derived from the DB (never the client).
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  // OrderItem rows for persisting the order on fulfillment.
  orderItems: ResolvedOrderItem[];
  totalCents: number;
};

type ProductKind = "book" | "gift" | "card";

// Normalizes a cart item to which catalog it points at. Returns null if it references
// zero or more than one product, so resolveCart can reject the whole cart.
function productRef(item: CartItem): { kind: ProductKind; id: string } | null {
  const refs = [
    item.bookId ? { kind: "book" as const, id: item.bookId } : null,
    item.giftId ? { kind: "gift" as const, id: item.giftId } : null,
    item.cardId ? { kind: "card" as const, id: item.cardId } : null,
  ].filter((r): r is { kind: ProductKind; id: string } => r !== null);
  return refs.length === 1 ? refs[0]! : null;
}

/**
 * Turns a cart (product ids + quantities, across books/gifts/cards) into Stripe line
 * items and Order items, pricing everything server-side from the DB. Returns null if any
 * item is malformed (not exactly one product ref) or references an id that doesn't exist,
 * so the caller can reject rather than charge for a phantom item.
 */
export async function resolveCart(items: CartItem[]): Promise<ResolvedCart | null> {
  const refs = items.map(productRef);
  if (refs.some((r) => r === null)) {
    return null;
  }

  const idsByKind: Record<ProductKind, string[]> = { book: [], gift: [], card: [] };
  for (const ref of refs) {
    idsByKind[ref!.kind].push(ref!.id);
  }

  const [books, gifts, cards] = await Promise.all([
    idsByKind.book.length
      ? prisma.book.findMany({ where: { id: { in: idsByKind.book } } })
      : Promise.resolve([]),
    idsByKind.gift.length
      ? prisma.gift.findMany({ where: { id: { in: idsByKind.gift } } })
      : Promise.resolve([]),
    idsByKind.card.length
      ? prisma.card.findMany({ where: { id: { in: idsByKind.card } } })
      : Promise.resolve([]),
  ]);
  const bookById = new Map(books.map((b) => [b.id, b]));
  const giftById = new Map(gifts.map((g) => [g.id, g]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: ResolvedOrderItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const ref = refs[i]!;

    let name: string;
    let description: string | undefined;
    let unitPriceCents: number;

    if (ref.kind === "book") {
      const book = bookById.get(ref.id);
      if (!book) return null;
      name = book.title;
      description = `by ${book.author}`;
      unitPriceCents = book.priceCents;
      orderItems.push({ bookId: book.id, quantity: item.quantity, unitPriceCents });
    } else if (ref.kind === "gift") {
      const gift = giftById.get(ref.id);
      if (!gift) return null;
      name = gift.name;
      description = gift.category ? `Gift · ${gift.category}` : "Gift";
      unitPriceCents = gift.priceCents;
      orderItems.push({ giftId: gift.id, quantity: item.quantity, unitPriceCents });
    } else {
      const card = cardById.get(ref.id);
      if (!card) return null;
      name = card.title;
      description = card.occasion ? `Card · ${card.occasion}` : "Card";
      unitPriceCents = card.priceCents;
      orderItems.push({ cardId: card.id, quantity: item.quantity, unitPriceCents });
    }

    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: "usd",
        unit_amount: unitPriceCents,
        // description is always set above, but guard anyway -- Stripe rejects "".
        product_data: { name, ...(description && { description }) },
      },
    });
  }

  const totalCents = orderItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  return { lineItems, orderItems, totalCents };
}
