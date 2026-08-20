import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { listCustomersQuerySchema } from "@/lib/validation/customers";

// Not in CLAUDE.md's original endpoint table -- added because story B9 (Loyalty
// Lookup) needs to search customers and no list/search endpoint existed. Staff-only,
// read-only; see conversation for context.
export async function GET(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { searchParams } = new URL(request.url);
  const parsed = listCustomersQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { q } = parsed.data;

  const customers = await prisma.customer.findMany({
    where: {
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { name: "asc" },
  });

  return ok(customers);
}
