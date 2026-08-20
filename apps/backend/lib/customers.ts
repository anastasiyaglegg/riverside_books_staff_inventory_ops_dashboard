import { prisma } from "@/lib/prisma";

export type CustomerIdentity = { name: string; email?: string; phone?: string };

/**
 * Used by guest-checkout-style flows (POST /orders, POST /events/:id/tickets) that
 * shouldn't require an explicit prior POST /customers signup step. Looks up by
 * email or phone (whichever was given) before creating, so a returning customer
 * with the same identity doesn't get a duplicate row.
 */
export async function findOrCreateCustomer(identity: CustomerIdentity) {
  const existing = await prisma.customer.findFirst({
    where: {
      OR: [
        ...(identity.email ? [{ email: identity.email }] : []),
        ...(identity.phone ? [{ phone: identity.phone }] : []),
      ],
    },
  });
  if (existing) {
    return existing;
  }
  return prisma.customer.create({ data: identity });
}
