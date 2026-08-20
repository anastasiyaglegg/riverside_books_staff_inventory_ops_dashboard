import { createClient } from "@supabase/supabase-js";

export type StaffSession = {
  authorized: true;
  user: { id: string; name: string; role: string };
};
type Unauthorized = { authorized: false };

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
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
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
