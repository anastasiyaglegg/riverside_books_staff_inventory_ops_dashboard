import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { deriveStockStatus } from "@/lib/inventory";
import { buildPaginationMeta, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { listBooksQuerySchema, createBookSchema } from "@/lib/validation/books";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listBooksQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { q, category, page, limit } = parsed.data;

  const where = {
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { author: { contains: q, mode: "insensitive" as const } },
        { isbn: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
  };

  // page/limit are both optional and independent of one another -- passing
  // neither preserves the original "return every match" behavior so existing
  // callers (e.g. Product C assembling full-catalog chat context) don't break.
  if (page === undefined && limit === undefined) {
    const books = await prisma.book.findMany({
      where,
      include: { inventory: true },
      orderBy: { title: "asc" },
    });
    return ok(books);
  }

  const currentPage = page ?? 1;
  const pageSize = limit ?? DEFAULT_PAGE_SIZE;

  const [books, totalItems] = await Promise.all([
    prisma.book.findMany({
      where,
      include: { inventory: true },
      orderBy: { title: "asc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.book.count({ where }),
  ]);

  return ok(books, 200, buildPaginationMeta(currentPage, pageSize, totalItems));
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const body = await request.json();
  const parsed = createBookSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { quantityOnHand, reorderThreshold, ...bookFields } = parsed.data;

  const book = await prisma.book.create({
    data: {
      ...bookFields,
      inventory: {
        create: {
          quantityOnHand,
          reorderThreshold,
          status: deriveStockStatus(quantityOnHand, reorderThreshold),
        },
      },
    },
    include: { inventory: true },
  });

  return ok(book, 201);
}
