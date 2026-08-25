import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const DISMISS_KEY = "riverside_hide_verify_banner";

// A soft nudge, never a block: signed-in-but-unverified customers can use the whole app.
// Dismissal is per-session (sessionStorage) so it reappears next visit but not after they
// wave it away this session.
export function EmailVerificationBanner() {
  const { user, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1",
  );
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!user || user.emailVerified || dismissed) {
    return null;
  }

  async function handleResend() {
    setStatus("sending");
    try {
      await resendVerification();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-6 py-2 text-sm text-amber-800">
        <span>
          Please verify your email{user.email ? ` (${user.email})` : ""} to secure your
          account.
        </span>
        {status === "sent" ? (
          <span className="font-medium text-amber-900">Verification email sent.</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={status === "sending"}
            className="font-semibold underline hover:text-amber-900 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Resend email"}
          </button>
        )}
        {status === "error" && (
          <span className="text-rose-600">Couldn't send. Try again shortly.</span>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-auto text-amber-600 hover:text-amber-900"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
