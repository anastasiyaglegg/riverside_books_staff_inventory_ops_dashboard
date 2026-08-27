import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// lastName optional: guest-checkout flows (POST /orders, /events/:id/tickets) collect a
// single name, so they pass firstName only.
export type CustomerIdentity = {
  firstName: string;
  lastName?: string | null;
  email?: string;
  phone?: string;
};

// Splits a display name ("Ada Lovelace") into first/last for create-fallbacks (the
// Firebase resolver, and the Stripe webhook's guest checkout). Everything before the
// first space is the first name; the remainder (if any) is the last name.
export function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const trimmed = fullName.trim();
  const gap = trimmed.indexOf(" ");
  if (gap === -1) {
    return { firstName: trimmed, lastName: null };
  }
  return { firstName: trimmed.slice(0, gap), lastName: trimmed.slice(gap + 1).trim() || null };
}

// Verified Firebase claims for the signed-in customer (from requireCustomerSession).
export type FirebaseCustomerClaims = {
  uid: string;
  email: string | null;
  name: string | null;
};

export type ResolveCustomerResult = { status: "ok"; customer: Customer };

/**
 * Resolves the verified Firebase user to their Customer row for GET /customers/me:
 *   1. Already linked by firebaseUid -> return it.
 *   2. A row exists for this email -> link it (stamp firebaseUid).
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
      const updated = await prisma.customer.update({
        where: { id: byEmail.id },
        data: { firebaseUid: claims.uid },
      });
      return { status: "ok", customer: updated };
    }
  }

  // No row for this uid or email: create one. Email/password sign-ups carry no name
  // claim, so fall back to the email local-part; the frontend's POST /customers (with
  // real first/last name) is the normal path -- this is the edge case.
  const { firstName, lastName } = splitName(claims.name ?? claims.email ?? "Customer");
  const created = await prisma.customer.create({
    data: {
      firstName,
      lastName,
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
