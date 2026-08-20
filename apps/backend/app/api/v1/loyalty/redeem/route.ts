import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { canRedeem, applyRedeem } from "@/lib/loyalty";
import { loyaltyActionSchema } from "@/lib/validation/loyalty";

export async function POST(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const body = await request.json();
  const parsed = loyaltyActionSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const { customerId } = parsed.data;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return fail("Customer not found", 404, "NOT_FOUND");
  }

  if (!canRedeem(customer.loyaltyStampCount)) {
    return fail("Insufficient loyalty stamps to redeem", 400, "INSUFFICIENT_BALANCE");
  }

  const newCount = applyRedeem(customer.loyaltyStampCount);

  const [updatedCustomer] = await prisma.$transaction([
    prisma.customer.update({ where: { id: customerId }, data: { loyaltyStampCount: newCount } }),
    prisma.loyaltyTransaction.create({ data: { customerId, type: "redeem" } }),
  ]);

  return ok(updatedCustomer);
}
