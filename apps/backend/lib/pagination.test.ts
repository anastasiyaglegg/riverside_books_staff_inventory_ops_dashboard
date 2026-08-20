import { describe, expect, it } from "vitest";
import { buildPaginationMeta } from "@/lib/pagination";

describe("buildPaginationMeta", () => {
  it("computes totalPages by rounding up partial pages", () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
    });
  });

  it("computes an exact page count with no remainder", () => {
    expect(buildPaginationMeta(2, 20, 40)).toEqual({
      page: 2,
      pageSize: 20,
      totalItems: 40,
      totalPages: 2,
    });
  });

  it("always reports at least one page, even with zero items", () => {
    expect(buildPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });
});
