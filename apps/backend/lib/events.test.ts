import { describe, it, expect } from "vitest";
import { isEventFull } from "./events";

describe("isEventFull", () => {
  it("returns false when capacity is null (unlimited)", () => {
    expect(isEventFull(500, null)).toBe(false);
  });

  it("returns false when reserved count is below capacity", () => {
    expect(isEventFull(5, 10)).toBe(false);
  });

  it("returns true when reserved count equals capacity", () => {
    expect(isEventFull(10, 10)).toBe(true);
  });

  it("returns true when reserved count exceeds capacity", () => {
    expect(isEventFull(11, 10)).toBe(true);
  });
});
