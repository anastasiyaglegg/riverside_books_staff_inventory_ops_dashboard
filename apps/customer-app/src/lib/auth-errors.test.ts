import { describe, expect, it } from "vitest";
import { FirebaseError } from "firebase/app";
import { friendlyAuthError } from "@/lib/auth-errors";

describe("friendlyAuthError", () => {
  it("maps a known Firebase code to friendly copy", () => {
    const error = new FirebaseError("auth/email-already-in-use", "raw");
    expect(friendlyAuthError(error)).toMatch(/already exists/i);
  });

  it("uses the same vague message for wrong-password and invalid-credential", () => {
    const wrong = friendlyAuthError(new FirebaseError("auth/wrong-password", "raw"));
    const invalid = friendlyAuthError(new FirebaseError("auth/invalid-credential", "raw"));
    expect(wrong).toBe(invalid);
    expect(wrong).toMatch(/incorrect email or password/i);
  });

  it("falls back to a generic message for an unmapped code", () => {
    const error = new FirebaseError("auth/some-new-code", "raw");
    expect(friendlyAuthError(error)).toBe("Something went wrong. Please try again.");
  });

  it("handles non-Firebase errors gracefully", () => {
    expect(friendlyAuthError(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
