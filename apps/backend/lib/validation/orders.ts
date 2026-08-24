import { z } from "zod";
import { cartItemSchema } from "@/lib/validation/checkout";

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
    // Books, gifts, and cards can all be pre-ordered; each line references exactly one.
    items: z.array(cartItemSchema).min(1),
  })
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: "Either customerEmail or customerPhone is required",
  });
