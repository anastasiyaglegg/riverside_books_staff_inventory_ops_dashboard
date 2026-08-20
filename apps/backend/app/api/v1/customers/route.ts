import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { listCustomersQuerySchema, createCustomerSchema } from "@/lib/validation/customers";

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

// Public (Product A signup/account creation) -- explicit create, unlike the
// find-or-create used by guest-checkout flows (POST /orders, POST /events/:id/tickets).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  try {
    const customer = await prisma.customer.create({ data: parsed.data });
    return ok(customer, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A customer with this email or phone already exists", 409, "CONFLICT");
    }
    throw err;
  }
}
