import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

// Public gift detail -- mirrors GET /books/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gift = await prisma.gift.findUnique({ where: { id } });
  if (!gift) {
    return fail("Gift not found", 404, "NOT_FOUND");
  }
  return ok(gift);
}
