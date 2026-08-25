import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useCustomer } from "@/lib/customer-context";
import { friendlyAuthError } from "@/lib/auth-errors";
import { isAcceptablePassword } from "@/lib/password";
import { ApiError } from "@/lib/api";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/form-classes";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

type Mode = "login" | "signup" | "forgot";

export function AuthPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { identify } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/account";

  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Already signed in? Don't show the login screen -- bounce to the account page.
  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  const passwordsMatch = password === confirm;
  const showMismatch = mode === "signup" && confirmTouched && !passwordsMatch;
  const canSubmitSignup =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    isAcceptablePassword(password) &&
    passwordsMatch;

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
    setConfirmTouched(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setNotice(null);

    if (mode === "forgot") {
      setSubmitting(true);
      try {
        await resetPassword(email.trim());
      } catch {
        // Deliberately swallow -- we show the same neutral message either way so an
        // attacker can't probe which emails are registered.
      } finally {
        setSubmitting(false);
        setNotice(
          "If an account exists for that email, we've sent a password reset link.",
        );
      }
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password, keepSignedIn);
        // Firebase = credentials; the loyalty record lives in the backend, joined by
        // email. Create/link it now so the account page is populated on arrival.
        try {
          await identify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
          });
        } catch (linkError) {
          // A 409 means a loyalty row already exists for this email (e.g. a prior guest
          // order). The Firebase account still succeeded; AccountPage will offer to
          // reconnect. Anything else, surface it.
          if (!(linkError instanceof ApiError && linkError.status === 409)) {
            throw linkError;
          }
        }
      } else {
        await signIn(email.trim(), password, keepSignedIn);
      }
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(friendlyAuthError(error));
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = submitting
    ? mode === "signup"
      ? "Creating account…"
      : mode === "forgot"
        ? "Sending…"
        : "Signing in…"
    : mode === "signup"
      ? "Create account"
      : mode === "forgot"
        ? "Send reset link"
        : "Log in";

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold text-stone-900">
        {mode === "signup"
          ? "Create your account"
          : mode === "forgot"
            ? "Reset your password"
            : "Welcome back"}
      </h1>
      <p className="mb-6 text-sm text-stone-500">
        {mode === "signup"
          ? "Track pre-orders and earn loyalty stamps at Riverside Books."
          : mode === "forgot"
            ? "Enter your email and we'll send you a reset link."
            : "Log in to see your pre-orders and loyalty stamps."}
      </p>

      {mode !== "forgot" && (
        <div className="mb-6 flex rounded-lg border border-stone-200 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              mode === "login"
                ? "bg-brand-700 text-white"
                : "text-stone-600 hover:text-brand-800"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-md py-1.5 transition-colors ${
              mode === "signup"
                ? "bg-brand-700 text-white"
                : "text-stone-600 hover:text-brand-800"
            }`}
          >
            Sign up
          </button>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {mode === "signup" && (
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="auth-first-name" className={LABEL_CLASSES}>
                First name
              </label>
              <input
                id="auth-first-name"
                type="text"
                className={INPUT_CLASSES}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="auth-last-name" className={LABEL_CLASSES}>
                Last name
              </label>
              <input
                id="auth-last-name"
                type="text"
                className={INPUT_CLASSES}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="auth-email" className={LABEL_CLASSES}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className={INPUT_CLASSES}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        {mode !== "forgot" && (
          <div className="flex flex-col gap-1">
            <PasswordInput
              id="auth-password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
            {mode === "signup" && <PasswordStrengthMeter password={password} />}
          </div>
        )}

        {mode === "signup" && (
          <div className="flex flex-col gap-1">
            <PasswordInput
              id="auth-confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              onBlur={() => setConfirmTouched(true)}
              autoComplete="new-password"
              required
            />
            {showMismatch && (
              <p className="text-xs text-rose-600">Passwords don't match.</p>
            )}
          </div>
        )}

        {mode === "login" && (
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="self-start text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Forgot password?
          </button>
        )}

        {mode !== "forgot" && (
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-brand-700 focus:ring-brand-200"
            />
            Keep me signed in
          </label>
        )}

        {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <button
          type="submit"
          disabled={submitting || (mode === "signup" && !canSubmitSignup)}
          className="mt-1 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:opacity-50"
        >
          {submitLabel}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="self-start text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Back to log in
          </button>
        )}
      </form>
    </div>
  );
}
