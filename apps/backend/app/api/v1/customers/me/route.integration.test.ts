import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireCustomerSession: vi.fn() }));

import { requireCustomerSession } from "@/lib/auth";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

const FIREBASE_UID = "firebase-uid-123";

function authAs(overrides: Partial<{ email: string | null; name: string | null }> = {}) {
  vi.mocked(requireCustomerSession).mockResolvedValue({
    authorized: true,
    user: {
      uid: FIREBASE_UID,
      email: overrides.email ?? "reader@example.com",
      emailVerified: true,
      name: overrides.name ?? "Ada Reader",
    },
  });
}

beforeEach(async () => {
  await resetDb();
  authAs();
});

describe("GET /api/v1/customers/me", () => {
  it("returns the customer already linked by firebaseUid", async () => {
    const linked = await prisma.customer.create({
      data: {
        firstName: "Ada",
        lastName: "Reader",
        email: "reader@example.com",
        firebaseUid: FIREBASE_UID,
        loyaltyStampCount: 5,
      },
    });

    const response = await GET(new Request("http://localhost/api/v1/customers/me"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(linked.id);
    expect(body.data.loyaltyStampCount).toBe(5);
  });

  it("links an existing email-matched row", async () => {
    const existing = await prisma.customer.create({
      data: {
        firstName: "Ada",
        lastName: "Reader",
        email: "reader@example.com",
        loyaltyStampCount: 3,
      },
    });

    const response = await GET(new Request("http://localhost/api/v1/customers/me"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(existing.id);
    // The row should now carry the firebaseUid so future logins hit the fast path.
    const reloaded = await prisma.customer.findUnique({ where: { id: existing.id } });
    expect(reloaded?.firebaseUid).toBe(FIREBASE_UID);
  });

  it("creates a new customer when no row matches the uid or email", async () => {
    const response = await GET(new Request("http://localhost/api/v1/customers/me"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.firebaseUid).toBe(FIREBASE_UID);
    // claims.name "Ada Reader" is split into first/last for the create-fallback.
    expect(body.data.firstName).toBe("Ada");
    expect(body.data.lastName).toBe("Reader");
    expect(body.data.loyaltyStampCount).toBe(0);
  });

  it("returns 401 when the Firebase token is missing or invalid", async () => {
    vi.mocked(requireCustomerSession).mockResolvedValueOnce({ authorized: false });

    const response = await GET(new Request("http://localhost/api/v1/customers/me"));
    expect(response.status).toBe(401);
  });
});
