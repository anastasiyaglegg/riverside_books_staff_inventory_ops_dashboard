import { z } from "zod";

export const listOrdersQuerySchema = z.object({
  status: z.enum(["placed", "ready_for_pickup", "completed", "cancelled"]).optional(),
  // Public self-service scope (see app/api/v1/orders/route.ts): when present, the
  // request is treated as "this customer's own order history," not a staff listing.
  customerId: z.string().uuid().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["placed", "ready_for_pickup", "completed", "cancelled"]),
});

export const createOrderSchema = z
  .object({
    customerName: z.string().min(1),
    customerEmail: z.string().email().optional(),
    customerPhone: z.string().min(1).optional(),
    items: z
      .array(
        z.object({
          bookId: z.string().uuid(),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
  })
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: "Either customerEmail or customerPhone is required",
  });
