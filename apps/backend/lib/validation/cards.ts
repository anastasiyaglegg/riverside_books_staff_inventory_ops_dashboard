import { z } from "zod";

export const listCardsQuerySchema = z.object({
  // Free-text search over title/description (see app/api/v1/cards/route.ts).
  q: z.string().optional(),
  // Occasion grouping, e.g. "birthday" | "thank-you" | "holiday" | "sympathy" | "blank".
  occasion: z.string().optional(),
  // Both optional and independent -- omitting both returns every match, mirroring
  // GET /books so full-catalog callers stay uncut.
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
