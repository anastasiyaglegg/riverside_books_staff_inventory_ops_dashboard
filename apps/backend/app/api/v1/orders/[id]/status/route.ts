import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { isValidOrderStatusTransition, type OrderStatus } from "@/lib/orders";
import { updateOrderStatusSchema } from "@/lib/validation/orders";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return fail("Order not found", 404, "NOT_FOUND");
  }

  const from = existing.status as OrderStatus;
  const to = parsed.data.status;
  if (!isValidOrderStatusTransition(from, to)) {
    return fail(`Cannot transition order from ${from} to ${to}`, 400, "INVALID_TRANSITION");
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: to },
    include: { customer: true, items: { include: { book: true } } },
  });

  return ok(order);
}
