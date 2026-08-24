import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CustomerIdentity = { name: string; email?: string; phone?: string };

// Verified Firebase claims for the signed-in customer (from requireCustomerSession).
export type FirebaseCustomerClaims = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

export type ResolveCustomerResult =
  | { status: "ok"; customer: Customer }
  // An existing row matches the email but the Firebase email isn't verified -- we refuse
  // to hand over (and link) someone else's loyalty record to an unproven email owner.
  // Payments will soon key off these rows, so linking must require a verified email.
  | { status: "email_unverified_conflict" };

/**
 * Resolves the verified Firebase user to their Customer row for GET /customers/me:
 *   1. Already linked by firebaseUid -> return it.
 *   2. A row exists for this email -> link it (stamp firebaseUid) ONLY if the email is
 *      verified; otherwise refuse (email_unverified_conflict).
 *   3. No row at all -> create one linked to this uid.
 * Never trusts client input -- `claims` come from a verified ID token.
 */
export async function resolveCustomerForFirebaseUser(
  claims: FirebaseCustomerClaims,
): Promise<ResolveCustomerResult> {
  const linked = await prisma.customer.findUnique({
    where: { firebaseUid: claims.uid },
  });
  if (linked) {
    return { status: "ok", customer: linked };
  }

  if (claims.email) {
    const byEmail = await prisma.customer.findUnique({
      where: { email: claims.email },
    });
    if (byEmail) {
      if (!claims.emailVerified) {
        return { status: "email_unverified_conflict" };
      }
      const updated = await prisma.customer.update({
        where: { id: byEmail.id },
        data: { firebaseUid: claims.uid },
      });
      return { status: "ok", customer: updated };
    }
  }

  const created = await prisma.customer.create({
    data: {
      name: claims.name ?? claims.email ?? "Customer",
      email: claims.email ?? undefined,
      firebaseUid: claims.uid,
    },
  });
  return { status: "ok", customer: created };
}

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
