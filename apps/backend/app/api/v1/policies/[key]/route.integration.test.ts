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

describe("PATCH /api/v1/policies/:key", () => {
  it("edits a policy value", async () => {
    await prisma.storePolicy.create({ data: { key: "hours", value: "Old hours" } });

    const response = await PATCH(
      new Request("http://localhost/api/v1/policies/hours", {
        method: "PATCH",
        body: JSON.stringify({ value: "Mon-Sat 9-6" }),
      }),
      { params: Promise.resolve({ key: "hours" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.value).toBe("Mon-Sat 9-6");
  });

  it("returns 400 for an empty value", async () => {
    await prisma.storePolicy.create({ data: { key: "hours", value: "Old hours" } });

    const response = await PATCH(
      new Request("http://localhost/api/v1/policies/hours", {
        method: "PATCH",
        body: JSON.stringify({ value: "" }),
      }),
      { params: Promise.resolve({ key: "hours" }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown key", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/v1/policies/missing", {
        method: "PATCH",
        body: JSON.stringify({ value: "x" }),
      }),
      { params: Promise.resolve({ key: "missing" }) },
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    await prisma.storePolicy.create({ data: { key: "hours", value: "Old hours" } });

    const response = await PATCH(
      new Request("http://localhost/api/v1/policies/hours", {
        method: "PATCH",
        body: JSON.stringify({ value: "New" }),
      }),
      { params: Promise.resolve({ key: "hours" }) },
    );
    expect(response.status).toBe(401);
  });
});
