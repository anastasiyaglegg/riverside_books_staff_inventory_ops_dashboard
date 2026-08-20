import { z } from "zod";

export const listCustomersQuerySchema = z.object({
  q: z.string().optional(),
});

export const createCustomerSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Either email or phone is required",
  });
