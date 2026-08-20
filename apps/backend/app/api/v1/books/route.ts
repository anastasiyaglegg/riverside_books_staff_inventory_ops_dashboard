import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { deriveStockStatus } from "@/lib/inventory";
import { listBooksQuerySchema, createBookSchema } from "@/lib/validation/books";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listBooksQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { q, category } = parsed.data;

  const books = await prisma.book.findMany({
    where: {
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
          { isbn: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(category && { category }),
    },
    include: { inventory: true },
  });

  return ok(books);
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
