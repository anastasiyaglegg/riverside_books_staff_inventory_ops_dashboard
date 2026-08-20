import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

// Public: same unguessable-UUID rationale as GET /customers/:id -- Product A needs
// to poll its own order's status without a customer-auth system.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { book: true } } },
  });
  if (!order) {
    return fail("Order not found", 404, "NOT_FOUND");
  }
  return ok(order);
}
