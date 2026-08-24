import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireCustomerSession: vi.fn() }));

import { requireCustomerSession } from "@/lib/auth";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

const FIREBASE_UID = "firebase-uid-123";

function authAs(
  overrides: Partial<{ email: string | null; emailVerified: boolean; name: string | null }> = {},
) {
  vi.mocked(requireCustomerSession).mockResolvedValue({
    authorized: true,
    user: {
      uid: FIREBASE_UID,
      email: overrides.email ?? "reader@example.com",
      emailVerified: overrides.emailVerified ?? true,
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

  it("links an existing email-matched row when the Firebase email is verified", async () => {
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

  it("refuses to link an email-matched row when the email is unverified (403)", async () => {
    authAs({ emailVerified: false });
    await prisma.customer.create({
      data: { firstName: "Ada", lastName: "Reader", email: "reader@example.com" },
    });

    const response = await GET(new Request("http://localhost/api/v1/customers/me"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("EMAIL_NOT_VERIFIED");
    // The pre-existing row must NOT have been linked.
    const untouched = await prisma.customer.findFirst({ where: { email: "reader@example.com" } });
    expect(untouched?.firebaseUid).toBeNull();
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
