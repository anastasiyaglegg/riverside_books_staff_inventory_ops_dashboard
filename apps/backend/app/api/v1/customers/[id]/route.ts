import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

// Public: Product A has no customer-auth system yet (tech spec defers it to a
// Supabase magic-link/OTP flow, not built), so this is reachable by anyone who
// knows the id -- same "unguessable UUID as the access control" pattern as
// GET /books/:id. Fine for MVP; revisit if a real customer session gets built.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    return fail("Customer not found", 404, "NOT_FOUND");
  }
  return ok(customer);
}
