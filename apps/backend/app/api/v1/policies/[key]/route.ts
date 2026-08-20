import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { updatePolicySchema } from "@/lib/validation/policies";

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { key } = await params;
  const body = await request.json();
  const parsed = updatePolicySchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.storePolicy.findUnique({ where: { key } });
  if (!existing) {
    return fail("Policy not found", 404, "NOT_FOUND");
  }

  const policy = await prisma.storePolicy.update({
    where: { key },
    data: { value: parsed.data.value },
  });

  return ok(policy);
}
