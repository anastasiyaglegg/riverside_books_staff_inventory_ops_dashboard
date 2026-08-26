import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { updateGiftSchema } from "@/lib/validation/gifts";

// Public gift detail -- mirrors GET /books/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gift = await prisma.gift.findUnique({ where: { id } });
  if (!gift) {
    return fail("Gift not found", 404, "NOT_FOUND");
  }
  return ok(gift);
}

// Staff edit / restock -- mirrors PATCH /books/[id].
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateGiftSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.gift.findUnique({ where: { id } });
  if (!existing) {
    return fail("Gift not found", 404, "NOT_FOUND");
  }

  const gift = await prisma.gift.update({ where: { id }, data: parsed.data });
  return ok(gift);
}

// Refuses to delete a gift with order history -- OrderItem rows carry no cascade and
// must never be silently orphaned/corrupted.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const existing = await prisma.gift.findUnique({ where: { id } });
  if (!existing) {
    return fail("Gift not found", 404, "NOT_FOUND");
  }

  const orderItemCount = await prisma.orderItem.count({ where: { giftId: id } });
  if (orderItemCount > 0) {
    return fail("Cannot delete a gift referenced by existing orders", 409, "REFERENCED_BY_ORDERS");
  }

  await prisma.gift.delete({ where: { id } });
  return ok({ id });
}
