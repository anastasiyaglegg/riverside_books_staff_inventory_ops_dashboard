import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/v1/events/:id/tickets", () => {
  it("reserves a ticket, without auth", async () => {
    const event = await prisma.event.create({
      data: { title: "Author Night", eventDate: new Date("2026-09-01"), capacity: 10 },
    });

    const response = await POST(
      new Request(`http://localhost/api/v1/events/${event.id}/tickets`, {
        method: "POST",
        body: JSON.stringify({ customerName: "Jane Doe", customerEmail: "jane@example.com" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.status).toBe("reserved");
    expect(body.data.customer.email).toBe("jane@example.com");
  });

  it("returns 400 once the event is at capacity", async () => {
    const event = await prisma.event.create({
      data: { title: "Small Event", eventDate: new Date("2026-09-01"), capacity: 1 },
    });
    const customer = await prisma.customer.create({
      data: { name: "Existing", email: "existing@example.com" },
    });
    await prisma.eventTicket.create({
      data: { eventId: event.id, customerId: customer.id, status: "reserved" },
    });

    const response = await POST(
      new Request(`http://localhost/api/v1/events/${event.id}/tickets`, {
        method: "POST",
        body: JSON.stringify({ customerName: "Jane Doe", customerEmail: "jane@example.com" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("does not count cancelled tickets against capacity", async () => {
    const event = await prisma.event.create({
      data: { title: "Small Event", eventDate: new Date("2026-09-01"), capacity: 1 },
    });
    const customer = await prisma.customer.create({
      data: { name: "Existing", email: "existing@example.com" },
    });
    await prisma.eventTicket.create({
      data: { eventId: event.id, customerId: customer.id, status: "cancelled" },
    });

    const response = await POST(
      new Request(`http://localhost/api/v1/events/${event.id}/tickets`, {
        method: "POST",
        body: JSON.stringify({ customerName: "Jane Doe", customerEmail: "jane@example.com" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(201);
  });

  it("returns 404 for an unknown event", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/events/missing/tickets", {
        method: "POST",
        body: JSON.stringify({ customerName: "Jane Doe", customerEmail: "jane@example.com" }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 when neither email nor phone is provided", async () => {
    const event = await prisma.event.create({
      data: { title: "Author Night", eventDate: new Date("2026-09-01") },
    });

    const response = await POST(
      new Request(`http://localhost/api/v1/events/${event.id}/tickets`, {
        method: "POST",
        body: JSON.stringify({ customerName: "Jane Doe" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(400);
  });
});
