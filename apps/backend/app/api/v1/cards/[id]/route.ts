import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { updateCardSchema } from "@/lib/validation/cards";

// Public card detail -- mirrors GET /books/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return fail("Card not found", 404, "NOT_FOUND");
  }
  return ok(card);
}

// Staff edit / restock -- mirrors PATCH /books/[id].
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateCardSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) {
    return fail("Card not found", 404, "NOT_FOUND");
  }

  const card = await prisma.card.update({ where: { id }, data: parsed.data });
  return ok(card);
}
