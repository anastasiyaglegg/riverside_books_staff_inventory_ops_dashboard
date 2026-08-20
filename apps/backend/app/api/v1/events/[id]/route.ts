import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { updateEventSchema } from "@/lib/validation/events";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return fail("Event not found", 404, "NOT_FOUND");
  }

  const { eventDate, ...rest } = parsed.data;
  const event = await prisma.event.update({
    where: { id },
    data: { ...rest, ...(eventDate && { eventDate: new Date(eventDate) }) },
  });

  return ok(event);
}
