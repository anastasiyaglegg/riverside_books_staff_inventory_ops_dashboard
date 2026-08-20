import { z } from "zod";

export const listOrdersQuerySchema = z.object({
  status: z.enum(["placed", "ready_for_pickup", "completed", "cancelled"]).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["placed", "ready_for_pickup", "completed", "cancelled"]),
});
