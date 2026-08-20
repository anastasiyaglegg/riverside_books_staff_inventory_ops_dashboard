import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";

export async function GET() {
  const policies = await prisma.storePolicy.findMany();
  return ok(policies);
}
