import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return fail("Customer not found", 404, "NOT_FOUND");
  }
  return ok(customer);
}
