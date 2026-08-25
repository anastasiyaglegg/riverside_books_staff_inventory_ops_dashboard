import { describe, expect, it } from "vitest";
import { stockStatusLabel } from "@/lib/stock";

describe("stockStatusLabel", () => {
  it("labels in_stock", () => {
    expect(stockStatusLabel("in_stock")).toBe("In Stock");
  });

  it("labels low_stock", () => {
    expect(stockStatusLabel("low_stock")).toBe("Low Stock");
  });

  it("labels out_of_stock", () => {
    expect(stockStatusLabel("out_of_stock")).toBe("Out of Stock");
  });

  it("falls back gracefully when a book has no inventory row yet", () => {
    expect(stockStatusLabel(undefined)).toBe("Availability Unknown");
  });
});
