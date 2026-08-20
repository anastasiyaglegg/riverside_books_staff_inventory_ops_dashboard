import { z } from "zod";

export const listCustomersQuerySchema = z.object({
  q: z.string().optional(),
});
