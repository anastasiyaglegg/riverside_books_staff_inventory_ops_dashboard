import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));

import { requireStaffSession } from "@/lib/auth";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";
import { STAMPS_PER_REWARD } from "@/lib/loyalty";

beforeEach(async () => {
  await resetDb();
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
});

describe("POST /api/v1/loyalty/redeem", () => {
  it("redeems a reward and logs a redeem transaction", async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        loyaltyStampCount: STAMPS_PER_REWARD,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/loyalty/redeem", {
        method: "POST",
        body: JSON.stringify({ customerId: customer.id }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.loyaltyStampCount).toBe(0);

    const tx = await prisma.loyaltyTransaction.findMany({ where: { customerId: customer.id } });
    expect(tx).toHaveLength(1);
    expect(tx[0]?.type).toBe("redeem");
  });

  it("rejects redemption when the balance is insufficient", async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        loyaltyStampCount: STAMPS_PER_REWARD - 1,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/loyalty/redeem", {
        method: "POST",
        body: JSON.stringify({ customerId: customer.id }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown customer", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/loyalty/redeem", {
        method: "POST",
        body: JSON.stringify({ customerId: "00000000-0000-0000-0000-000000000000" }),
      }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated as staff", async () => {
    vi.mocked(requireStaffSession).mockResolvedValueOnce({ authorized: false });
    const response = await POST(
      new Request("http://localhost/api/v1/loyalty/redeem", {
        method: "POST",
        body: JSON.stringify({ customerId: "00000000-0000-0000-0000-000000000000" }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
