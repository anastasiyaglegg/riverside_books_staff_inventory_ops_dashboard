import { describe, expect, it } from "vitest";
import {
  evaluatePassword,
  isAcceptablePassword,
  MIN_ACCEPTABLE_SCORE,
  MIN_PASSWORD_LENGTH,
} from "@/lib/password";

describe("evaluatePassword", () => {
  it("scores an empty password as too weak with no suggestion", () => {
    const result = evaluatePassword("");
    expect(result.score).toBe(0);
    expect(result.label).toBe("Too weak");
    expect(result.suggestion).toBeNull();
  });

  it("flags a common password as weak even when it looks complex", () => {
    // A naive regex checker would pass "Password123!" -- zxcvbn should not.
    const result = evaluatePassword("Password123!");
    expect(result.score).toBeLessThan(MIN_ACCEPTABLE_SCORE);
  });

  it("scores a long random passphrase as strong", () => {
    const result = evaluatePassword("correct-horse-battery-staple-42");
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(["Good", "Strong"]).toContain(result.label);
  });
});

describe("isAcceptablePassword", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6);
    expect(isAcceptablePassword("aB3$")).toBe(false);
  });

  it("rejects a weak password even if long enough", () => {
    expect(isAcceptablePassword("password")).toBe(false);
  });

  it("accepts a sufficiently strong password", () => {
    expect(isAcceptablePassword("correct-horse-battery-staple-42")).toBe(true);
  });
});
