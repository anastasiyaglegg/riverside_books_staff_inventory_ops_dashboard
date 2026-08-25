import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { listGiftsQuerySchema } from "@/lib/validation/gifts";

// Public storefront catalog for gifts. Read-only, no auth -- mirrors GET /books.
// Gifts track stock inline via quantityOnHand, so there's no Inventory join here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listGiftsQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { q, category, page, limit } = parsed.data;

  const where = {
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
  };

  // page/limit are both optional and independent -- passing neither returns every
  // match, matching GET /books so full-catalog callers (e.g. Product C chat context)
  // don't break.
  if (page === undefined && limit === undefined) {
    const gifts = await prisma.gift.findMany({ where, orderBy: { name: "asc" } });
    return ok(gifts);
  }

  const currentPage = page ?? 1;
  const pageSize = limit ?? DEFAULT_PAGE_SIZE;

  const [gifts, totalItems] = await Promise.all([
    prisma.gift.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.gift.count({ where }),
  ]);

  return ok(gifts, 200, buildPaginationMeta(currentPage, pageSize, totalItems));
}
