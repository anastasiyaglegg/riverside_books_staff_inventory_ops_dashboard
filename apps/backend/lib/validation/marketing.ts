import { z } from "zod";

// Staff pick specific titles to generate content for, rather than the whole
// catalog running through an LLM on every request.
export const generateMarketingContentSchema = z.object({
  bookIds: z.array(z.string().uuid()).min(1),
});
