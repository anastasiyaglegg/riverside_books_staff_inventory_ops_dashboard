import { describe, it, expect } from "vitest";
import { requireStaffSession } from "./auth";

describe("requireStaffSession", () => {
  it("returns unauthorized when no Authorization header is present", async () => {
    const request = new Request("http://localhost/api/v1/inventory");
    const result = await requireStaffSession(request);
    expect(result.authorized).toBe(false);
  });

  it("returns unauthorized when the Authorization header isn't a Bearer token", async () => {
    const request = new Request("http://localhost/api/v1/inventory", {
      headers: { Authorization: "Basic abc123" },
    });
    const result = await requireStaffSession(request);
    expect(result.authorized).toBe(false);
  });
});
