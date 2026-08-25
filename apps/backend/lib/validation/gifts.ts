import { z } from "zod";

export const listGiftsQuerySchema = z.object({
  // Free-text search over name/description (see app/api/v1/gifts/route.ts).
  q: z.string().optional(),
  // Free-form grouping, e.g. "mug" | "tote" | "stationery" | "puzzle".
  category: z.string().optional(),
  // Both optional and independent -- omitting both returns every match, mirroring
  // GET /books so full-catalog callers stay uncut.
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
