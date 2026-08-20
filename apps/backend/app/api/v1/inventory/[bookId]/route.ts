import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { deriveStockStatus } from "@/lib/inventory";
import { updateInventorySchema } from "@/lib/validation/inventory";

export async function PATCH(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { bookId } = await params;
  const body = await request.json();
  const parsed = updateInventorySchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.inventory.findUnique({ where: { bookId } });
  if (!existing) {
    return fail("Inventory record not found", 404, "NOT_FOUND");
  }

  const { quantityOnHand } = parsed.data;
  const inventory = await prisma.inventory.update({
    where: { bookId },
    data: {
      quantityOnHand,
      status: deriveStockStatus(quantityOnHand, existing.reorderThreshold),
      lastAdjustedById: auth.user.id,
    },
    include: { book: true, lastAdjustedBy: { select: { id: true, name: true } } },
  });

  return ok(inventory);
}
