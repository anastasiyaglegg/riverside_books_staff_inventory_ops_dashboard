import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { isValidOrderStatusTransition, type OrderStatus } from "@/lib/orders";
import { applyEarn } from "@/lib/loyalty";
import { restoreStockForOrderItems } from "@/lib/fulfillment";
import { updateOrderStatusSchema } from "@/lib/validation/orders";

// Every order line points at one of three catalogs -- include all three so the response
// renders any product type (matches GET /orders).
const ORDER_ITEM_INCLUDE = { book: true, gift: true, card: true } as const;

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

  // Two fulfillment side effects ride on the status change, so they share its transaction:
  //  - completed: the purchase is fulfilled, so the customer earns one loyalty stamp.
  //    completed is terminal, so an order can only reach it once -- no double-earn guard needed.
  //  - cancelled: the reserved stock is handed back (mirrors the decrement at order creation).
  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: to },
      include: { customer: true, items: { include: ORDER_ITEM_INCLUDE } },
    });

    if (to === "completed") {
      const customer = await tx.customer.findUnique({ where: { id: existing.customerId } });
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { loyaltyStampCount: applyEarn(customer.loyaltyStampCount) },
        });
        await tx.loyaltyTransaction.create({
          data: { customerId: customer.id, type: "earn", relatedOrderId: id },
        });
      }
    } else if (to === "cancelled") {
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      await restoreStockForOrderItems(tx, items);
    }

    return updated;
  });

  return ok(order);
}
