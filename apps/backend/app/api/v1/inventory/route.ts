import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { listInventoryQuerySchema } from "@/lib/validation/inventory";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, buildPaginationMeta } from "@/lib/pagination";

export async function GET(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const parsed = listInventoryQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { status, page = 1, pageSize: requestedPageSize = DEFAULT_PAGE_SIZE } = parsed.data;
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

  const where = { ...(status && { status }) };
  const [inventory, totalItems] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: { book: true, lastAdjustedBy: { select: { id: true, name: true } } },
      // Newest-touched first, so a book a staffer just added or adjusted shows
      // up on page 1 without having to hunt for it across pages.
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventory.count({ where }),
  ]);

  return ok(inventory, 200, buildPaginationMeta(page, pageSize, totalItems));
}
