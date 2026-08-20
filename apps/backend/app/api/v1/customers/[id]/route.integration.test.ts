import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/customers/:id", () => {
  it("returns the customer profile including loyalty count, without auth", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Jane Doe", email: "jane@example.com", loyaltyStampCount: 4 },
    });

    const response = await GET(new Request(`http://localhost/api/v1/customers/${customer.id}`), {
      params: Promise.resolve({ id: customer.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.loyaltyStampCount).toBe(4);
  });

  it("returns 404 for an unknown id", async () => {
    const response = await GET(new Request("http://localhost/api/v1/customers/missing"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(response.status).toBe(404);
  });
});
