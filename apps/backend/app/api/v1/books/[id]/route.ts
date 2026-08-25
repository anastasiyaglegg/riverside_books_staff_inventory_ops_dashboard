import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { updateBookSchema } from "@/lib/validation/books";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { inventory: true, marketingContent: true },
  });
  if (!book) {
    return fail("Book not found", 404, "NOT_FOUND");
  }
  return ok(book);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateBookSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.book.findUnique({ where: { id } });
  if (!existing) {
    return fail("Book not found", 404, "NOT_FOUND");
  }

  const book = await prisma.book.update({
    where: { id },
    data: parsed.data,
    include: { inventory: true },
  });

  return ok(book);
}
