import { z } from "zod";

// The client sends only book ids + quantities. Prices/amounts are always computed
// server-side from Book.priceCents -- never trust a price from the client.
export const createCheckoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        bookId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  // Optional: a signed-in customer's id, so the resulting order links to their record.
  // Guest checkouts omit it and are matched by the email Stripe collects.
  customerId: z.string().uuid().optional(),
});
