import { ok, fail } from "@/lib/api-response";
import { requireCustomerSession } from "@/lib/auth";
import { resolveCustomerForFirebaseUser } from "@/lib/customers";

// Firebase-authenticated self-lookup for Product A. Unlike GET /customers/:id (public,
// unguessable-UUID), this needs a valid Firebase ID token and returns *that* customer --
// so a returning customer restores their loyalty/orders on any device after logging in,
// without knowing their UUID. Links the Firebase uid to an existing row on first call,
// or creates the row if none exists.
export async function GET(request: Request) {
  const auth = await requireCustomerSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const result = await resolveCustomerForFirebaseUser(auth.user);
  return ok(result.customer);
}
