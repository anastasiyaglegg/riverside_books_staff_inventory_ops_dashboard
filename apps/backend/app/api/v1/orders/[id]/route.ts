import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

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
