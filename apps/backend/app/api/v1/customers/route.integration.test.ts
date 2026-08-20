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

describe("GET /api/v1/customers", () => {
  it("lists all customers with no query", async () => {
    await prisma.customer.create({ data: { name: "Jane Doe", email: "jane@example.com" } });
    await prisma.customer.create({ data: { name: "John Smith", email: "john@example.com" } });

    const response = await GET(new Request("http://localhost/api/v1/customers"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("filters by name/email/phone match", async () => {
    await prisma.customer.create({ data: { name: "Jane Doe", email: "jane@example.com" } });
    await prisma.customer.create({ data: { name: "John Smith", email: "john@example.com" } });

    const response = await GET(new Request("http://localhost/api/v1/customers?q=jane"));
    const body = await response.json();

    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Jane Doe");
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await GET(new Request("http://localhost/api/v1/customers"));
    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/customers", () => {
  it("creates a customer profile, without auth", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe("Jane Doe");
    expect(body.data.loyaltyStampCount).toBe(0);
  });

  it("returns 400 when neither email nor phone is provided", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Jane Doe" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 409 for a duplicate email", async () => {
    await prisma.customer.create({ data: { name: "Existing", email: "jane@example.com" } });

    const response = await POST(
      new Request("http://localhost/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com" }),
      }),
    );
    expect(response.status).toBe(409);
  });
});
