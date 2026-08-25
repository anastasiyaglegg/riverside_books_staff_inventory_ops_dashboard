import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { listCardsQuerySchema } from "@/lib/validation/cards";

// Public storefront catalog for greeting cards. Read-only, no auth -- mirrors GET /books.
// Cards track stock inline via quantityOnHand, so there's no Inventory join here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listCardsQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { q, occasion, page, limit } = parsed.data;

  const where = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(occasion && { occasion }),
  };

  // page/limit are both optional and independent -- passing neither returns every
  // match, matching GET /books so full-catalog callers (e.g. Product C chat context)
  // don't break.
  if (page === undefined && limit === undefined) {
    const cards = await prisma.card.findMany({ where, orderBy: { title: "asc" } });
    return ok(cards);
  }

  const currentPage = page ?? 1;
  const pageSize = limit ?? DEFAULT_PAGE_SIZE;

  const [cards, totalItems] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy: { title: "asc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.card.count({ where }),
  ]);

  return ok(cards, 200, buildPaginationMeta(currentPage, pageSize, totalItems));
}
