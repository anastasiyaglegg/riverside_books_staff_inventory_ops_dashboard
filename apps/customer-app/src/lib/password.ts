import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommon from "@zxcvbn-ts/language-common";
import * as zxcvbnEn from "@zxcvbn-ts/language-en";

// Build the estimator once at module load with the common (language-agnostic)
// dictionaries, the English dictionary + feedback translations, and the keyboard-
// adjacency graph. This is what lets it flag "Password123!" as weak even though a naive
// regex would call it strong -- and produce readable English suggestions.
const zxcvbn = new ZxcvbnFactory({
  dictionary: { ...zxcvbnCommon.dictionary, ...zxcvbnEn.dictionary },
  graphs: zxcvbnCommon.adjacencyGraphs,
  translations: zxcvbnEn.translations,
});

// zxcvbn scores 0 (worst) .. 4 (best). We gate signup at >= 2 ("good"): strong enough to
// resist online guessing, without frustrating users the way a "must be 4" wall does.
export const MIN_ACCEPTABLE_SCORE = 2;

// Firebase's own server-side floor is 6 characters; we mirror it so we can give the user
// an instant, friendly message instead of waiting for an auth/weak-password round-trip.
export const MIN_PASSWORD_LENGTH = 6;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordScore;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  // A single actionable hint pulled from zxcvbn's feedback, or null when there's nothing
  // useful to say (e.g. an empty field or an already-strong password).
  suggestion: string | null;
};

const LABELS: Record<PasswordScore, PasswordStrength["label"]> = {
  0: "Too weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

export function evaluatePassword(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Too weak", suggestion: null };
  }
  const result = zxcvbn.check(password);
  const score = result.score as PasswordScore;
  const suggestion =
    result.feedback.warning || result.feedback.suggestions[0] || null;
  return { score, label: LABELS[score], suggestion };
}

// The single source of truth for "can this password be used to sign up" -- both the
// live meter and the submit handler consult this so they never disagree.
export function isAcceptablePassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    evaluatePassword(password).score >= MIN_ACCEPTABLE_SCORE
  );
}
