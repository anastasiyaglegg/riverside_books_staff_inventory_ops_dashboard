import { z } from "zod";

export const listInventoryQuerySchema = z.object({
  status: z.enum(["in_stock", "low_stock", "out_of_stock"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const updateInventorySchema = z.object({
  quantityOnHand: z.number().int().nonnegative(),
});
