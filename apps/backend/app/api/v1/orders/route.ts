import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { listOrdersQuerySchema } from "@/lib/validation/orders";

export async function GET(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const parsed = listOrdersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { status } = parsed.data;

  const orders = await prisma.order.findMany({
    where: { ...(status && { status }) },
    include: { customer: true, items: { include: { book: true } } },
    orderBy: { createdAt: "asc" },
  });

  return ok(orders);
}
