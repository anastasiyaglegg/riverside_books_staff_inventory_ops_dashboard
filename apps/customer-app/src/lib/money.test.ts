import { describe, expect, it } from "vitest";
import { formatCents } from "@/lib/money";

describe("formatCents", () => {
  it("formats whole dollars", () => {
    expect(formatCents(1200)).toBe("$12.00");
  });

  it("formats cents that aren't a round dollar amount", () => {
    expect(formatCents(1299)).toBe("$12.99");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });
});
