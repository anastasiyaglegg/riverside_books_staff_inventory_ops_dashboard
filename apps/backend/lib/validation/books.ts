import { z } from "zod";

export const listBooksQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1).optional(),
  priceCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
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
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
