import { describe, it, expect } from "vitest";
import { deriveStockStatus } from "./inventory";

describe("deriveStockStatus", () => {
  it("returns out_of_stock when quantity is 0", () => {
    expect(deriveStockStatus(0, 2)).toBe("out_of_stock");
  });

  it("returns out_of_stock when quantity is negative", () => {
    expect(deriveStockStatus(-1, 2)).toBe("out_of_stock");
  });

  it("returns low_stock when quantity is at threshold", () => {
    expect(deriveStockStatus(2, 2)).toBe("low_stock");
  });

  it("returns low_stock when quantity is below threshold but above 0", () => {
    expect(deriveStockStatus(1, 2)).toBe("low_stock");
  });

  it("returns in_stock when quantity is above threshold", () => {
    expect(deriveStockStatus(5, 2)).toBe("in_stock");
  });
});
