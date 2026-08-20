import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("PATCH /api/v1/events/:id", () => {
  it("edits an event", async () => {
    const event = await prisma.event.create({
      data: { title: "Old", eventDate: new Date("2026-09-01") },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.title).toBe("New");
  });

  it("returns 400 for an empty update body", async () => {
    const event = await prisma.event.create({
      data: { title: "Old", eventDate: new Date("2026-09-01") },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown event", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/events/missing", {
        method: "PATCH",
        body: JSON.stringify({ title: "New" }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const event = await prisma.event.create({
      data: { title: "Old", eventDate: new Date("2026-09-01") },
    });

    const response = await PATCH(
      new Request(`http://localhost/api/v1/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New" }),
      }),
      { params: Promise.resolve({ id: event.id }) },
    );
    expect(response.status).toBe(401);
  });
});
