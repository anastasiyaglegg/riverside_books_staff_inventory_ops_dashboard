import { createClient } from "@supabase/supabase-js";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";

export type StaffSession = {
  authorized: true;
  user: { id: string; name: string; role: string };
};
type Unauthorized = { authorized: false };

export type CustomerSession = {
  authorized: true;
  // Verified Firebase claims -- never trust these from the client body.
  user: { uid: string; email: string | null; emailVerified: boolean };
};

function extractBearer(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
}

function getSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to verify sessions");
  }
  return createClient(url, serviceRoleKey);
}

/**
 * Verifies the bearer token against Supabase Auth, then looks up the matching
 * StaffUser row (id == Supabase Auth user id) so route handlers get a real
 * role -- never trust a role/user id sent from the client body.
 */
export async function requireStaffSession(request: Request): Promise<StaffSession | Unauthorized> {
  const token = extractBearer(request);
  if (!token) {
    return { authorized: false };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { authorized: false };
  }

  // Imported lazily so branches above (no/invalid token) never require DATABASE_URL --
  // keeps requireStaffSession's early returns unit-testable without a DB connection.
  const { prisma } = await import("@/lib/prisma");
  const staffUser = await prisma.staffUser.findUnique({ where: { id: data.user.id } });
  if (!staffUser) {
    return { authorized: false };
  }

  return {
    authorized: true,
    user: { id: staffUser.id, name: staffUser.name, role: staffUser.role },
  };
}

/**
 * Verifies a Firebase ID token for a customer session (Product A). Returns the verified
 * uid/email/emailVerified claims -- the route decides how to resolve those to a Customer
 * row (see resolveCustomerForFirebaseUser in lib/customers.ts). Unlike requireStaffSession
 * it does no DB lookup itself, so a customer row need not exist yet.
 */
export async function requireCustomerSession(
  request: Request,
): Promise<CustomerSession | Unauthorized> {
  const token = extractBearer(request);
  if (!token) {
    return { authorized: false };
  }

  const decoded = await verifyFirebaseIdToken(token);
  if (!decoded) {
    return { authorized: false };
  }

  return {
    authorized: true,
    user: {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
    },
  };
}
