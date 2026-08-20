import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
});

describe("GET /api/v1/policies", () => {
  it("returns all store policies without requiring auth", async () => {
    await prisma.storePolicy.create({ data: { key: "hours", value: "Mon-Fri 9-5" } });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].key).toBe("hours");
  });
});
