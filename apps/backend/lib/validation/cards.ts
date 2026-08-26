import { z } from "zod";

export const listCardsQuerySchema = z.object({
  // Free-text search over title/description (see app/api/v1/cards/route.ts).
  q: z.string().optional(),
  // Occasion grouping, e.g. "birthday" | "thank-you" | "holiday" | "sympathy" | "blank".
  occasion: z.string().optional(),
  // Both optional and independent -- omitting both returns every match, mirroring
  // GET /books so full-catalog callers stay uncut.
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Staff create of a card. quantityOnHand is the initial stock, inline on the row
// (cards have no separate Inventory join -- see the Card model).
export const createCardSchema = z.object({
  title: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  occasion: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  quantityOnHand: z.number().int().nonnegative().default(0),
});

// Staff edit of a card, including restocking via quantityOnHand. All fields optional --
// callers PATCH just what changed -- but at least one is required.
export const updateCardSchema = z
  .object({
    title: z.string().min(1),
    priceCents: z.number().int().nonnegative(),
    occasion: z.string().nullable(),
    description: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    quantityOnHand: z.number().int().nonnegative(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
