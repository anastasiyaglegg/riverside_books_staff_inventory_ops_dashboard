import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth";
import { createEventSchema } from "@/lib/validation/events";

export async function GET() {
  const events = await prisma.event.findMany({ orderBy: { eventDate: "asc" } });
  return ok(events);
}

export async function POST(request: Request) {
  const auth = await requireStaffSession(request);
  if (!auth.authorized) {
    return fail("Unauthorized", 401, "UNAUTHORIZED");
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }

  const event = await prisma.event.create({
    data: { ...parsed.data, eventDate: new Date(parsed.data.eventDate) },
  });

  return ok(event, 201);
}
