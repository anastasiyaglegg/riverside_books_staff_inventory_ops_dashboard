import { prisma } from "@/lib/prisma";
import { ok, fail, failValidation } from "@/lib/api-response";
import { findOrCreateCustomer } from "@/lib/customers";
import { isEventFull } from "@/lib/events";
import { reserveTicketSchema } from "@/lib/validation/events";

// Public (Product A): reserves a ticket for an event, rejecting once capacity
// (null = unlimited) is reached.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const body = await request.json();
  const parsed = reserveTicketSchema.safeParse(body);
  if (!parsed.success) {
    return failValidation(parsed.error);
  }
  const { customerName, customerEmail, customerPhone } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return fail("Event not found", 404, "NOT_FOUND");
  }

  const reservedCount = await prisma.eventTicket.count({
    where: { eventId, status: { not: "cancelled" } },
  });
  if (isEventFull(reservedCount, event.capacity)) {
    return fail("This event is at capacity", 400, "EVENT_FULL");
  }

  const customer = await findOrCreateCustomer({
    firstName: customerName,
    email: customerEmail,
    phone: customerPhone,
  });

  const ticket = await prisma.eventTicket.create({
    data: { eventId, customerId: customer.id, status: "reserved" },
    include: { customer: true, event: true },
  });

  return ok(ticket, 201);
}
