import { z } from "zod";

export const updatePolicySchema = z.object({
  value: z.string().min(1),
});
