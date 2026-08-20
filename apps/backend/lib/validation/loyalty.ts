import { z } from "zod";

export const loyaltyActionSchema = z.object({
  customerId: z.string().uuid(),
});
