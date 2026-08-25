import { FirebaseError } from "firebase/app";

// Firebase throws coded errors (e.g. "auth/wrong-password"). Surfacing the raw code or
// the default English message ("Firebase: Error (auth/...).") reads as broken, so we map
// the ones a customer can actually hit to friendly copy. Anything unmapped falls back to
// a generic line rather than leaking internals.
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/user-disabled": "This account has been disabled. Please contact the store.",
  // Modern Firebase collapses wrong-password / user-not-found into invalid-credential
  // when email-enumeration protection is on -- we keep all three mapped to the same
  // deliberately vague copy so we never reveal whether an email is registered.
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/email-already-in-use":
    "An account with this email already exists. Try logging in instead.",
  "auth/weak-password": "Please choose a stronger password.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/missing-password": "Please enter your password.",
};

export function friendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
