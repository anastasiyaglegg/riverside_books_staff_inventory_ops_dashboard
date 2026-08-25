import { z } from "zod";

export const listBooksQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  // Both optional and independent -- omitting both preserves the original
  // "return everything matching q/category" behavior for existing callers
  // (e.g. Product C assembling full-catalog chat context).
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1).optional(),
  priceCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  // Staff-entered average rating, 0-5. Optional -- unset until a staff member rates it;
  // never inferred or defaulted (Product D's mediation layer skips unrated books rather
  // than invent a value -- see lib/marketing/catalog-mapper.ts).
  rating: z.number().min(0).max(5).optional(),
  // Initial stock -- creates the paired Inventory row.
  quantityOnHand: z.number().int().nonnegative().default(0),
  reorderThreshold: z.number().int().nonnegative().default(2),
});

export const updateBookSchema = z
  .object({
    title: z.string().min(1),
    author: z.string().min(1),
    isbn: z.string().min(1).nullable(),
    priceCents: z.number().int().nonnegative(),
    category: z.string().nullable(),
    description: z.string().nullable(),
    imageUrl: z.string().url().nullable(),
    rating: z.number().min(0).max(5).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
