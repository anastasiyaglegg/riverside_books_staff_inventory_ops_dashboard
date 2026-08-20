import { describe, it, expect } from "vitest";
import { STAMPS_PER_REWARD, canRedeem, applyEarn, applyRedeem } from "./loyalty";

describe("canRedeem", () => {
  it("returns false below the reward threshold", () => {
    expect(canRedeem(STAMPS_PER_REWARD - 1)).toBe(false);
  });

  it("returns true at the reward threshold", () => {
    expect(canRedeem(STAMPS_PER_REWARD)).toBe(true);
  });

  it("returns true above the reward threshold", () => {
    expect(canRedeem(STAMPS_PER_REWARD + 5)).toBe(true);
  });
});

describe("applyEarn", () => {
  it("increments the stamp count by one", () => {
    expect(applyEarn(0)).toBe(1);
    expect(applyEarn(4)).toBe(5);
  });
});

describe("applyRedeem", () => {
  it("subtracts STAMPS_PER_REWARD when eligible", () => {
    expect(applyRedeem(STAMPS_PER_REWARD)).toBe(0);
    expect(applyRedeem(STAMPS_PER_REWARD + 3)).toBe(3);
  });

  it("throws when balance is insufficient", () => {
    expect(() => applyRedeem(STAMPS_PER_REWARD - 1)).toThrow();
  });
});
