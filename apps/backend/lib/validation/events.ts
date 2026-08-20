import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  eventDate: z.string().datetime(),
  capacity: z.number().int().positive().optional(),
});

export const updateEventSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().nullable(),
    eventDate: z.string().datetime(),
    capacity: z.number().int().positive().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
