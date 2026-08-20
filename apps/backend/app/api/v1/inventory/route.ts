import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { listInventoryQuerySchema } from "@/lib/validation/inventory";

export async function GET(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const parsed = listInventoryQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }
  const { status } = parsed.data;

  const inventory = await prisma.inventory.findMany({
    where: { ...(status && { status }) },
    include: { book: true, lastAdjustedBy: { select: { id: true, name: true } } },
  });

  return ok(inventory);
}
