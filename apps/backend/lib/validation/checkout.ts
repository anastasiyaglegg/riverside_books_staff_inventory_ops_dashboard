import { z } from "zod";

// A cart line references exactly one product -- a book, a gift, or a card -- by id, plus
// a quantity. The client sends only ids + quantities; prices/amounts are always computed
// server-side (resolveCart) from the DB, never trusted from the client.
export const cartItemSchema = z
  .object({
    bookId: z.string().uuid().optional(),
    giftId: z.string().uuid().optional(),
    cardId: z.string().uuid().optional(),
    quantity: z.number().int().positive(),
  })
  .refine((i) => [i.bookId, i.giftId, i.cardId].filter(Boolean).length === 1, {
    message: "Each item must reference exactly one of bookId, giftId, or cardId",
  });

export const createCheckoutSessionSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  // Optional: a signed-in customer's id, so the resulting order links to their record.
  // Guest checkouts omit it and are matched by the email Stripe collects.
  customerId: z.string().uuid().optional(),
});
