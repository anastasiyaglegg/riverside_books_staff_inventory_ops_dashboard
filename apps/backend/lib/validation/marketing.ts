import { z } from "zod";

// Staff pick specific titles/events to generate content for, rather than the
// whole catalog running through an LLM on every request. bookIds and eventIds
// are both optional, but at least one id must be supplied.
export const generateMarketingContentSchema = z
  .object({
    bookIds: z.array(z.string().uuid()).optional(),
    eventIds: z.array(z.string().uuid()).optional(),
  })
  .refine((d) => (d.bookIds?.length ?? 0) + (d.eventIds?.length ?? 0) > 0, {
    message: "Provide at least one of bookIds or eventIds",
  });
