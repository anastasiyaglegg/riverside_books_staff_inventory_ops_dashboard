import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("GET /api/v1/events", () => {
  it("returns upcoming events without requiring auth", async () => {
    await prisma.event.create({
      data: { title: "Author Night", eventDate: new Date("2026-09-01") },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

describe("POST /api/v1/events", () => {
  it("creates an event", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/events", {
        method: "POST",
        body: JSON.stringify({ title: "Book Club", eventDate: "2026-10-01T18:00:00.000Z" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.title).toBe("Book Club");
  });

  it("returns 400 for an invalid eventDate", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/events", {
        method: "POST",
        body: JSON.stringify({ title: "Book Club", eventDate: "not-a-date" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await POST(
      new Request("http://localhost/api/v1/events", {
        method: "POST",
        body: JSON.stringify({ title: "Book Club", eventDate: "2026-10-01T18:00:00.000Z" }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
