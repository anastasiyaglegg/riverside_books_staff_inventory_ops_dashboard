import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";

// Public card detail -- mirrors GET /books/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) {
    return fail("Card not found", 404, "NOT_FOUND");
  }
  return ok(card);
}
