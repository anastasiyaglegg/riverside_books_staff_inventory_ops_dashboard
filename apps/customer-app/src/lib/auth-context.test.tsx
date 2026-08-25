import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/lib/auth-context";

// --- Firebase mocks ---------------------------------------------------------
// Record the sequence of calls so we can assert setPersistence runs BEFORE sign-in.
// vi.hoisted keeps these initialized before the hoisted vi.mock factory runs.
const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  authStateCallback: null as ((user: unknown) => void) | null,
  setPersistence: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  firebaseSignOut: vi.fn(),
}));
const calls = mocks.calls;
const { signInWithEmailAndPassword, sendEmailVerification } = mocks;

vi.mock("firebase/auth", () => ({
  browserLocalPersistence: "LOCAL",
  browserSessionPersistence: "SESSION",
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    mocks.authStateCallback = cb;
    return () => undefined;
  },
  setPersistence: mocks.setPersistence.mockImplementation((_auth, persistence) => {
    mocks.calls.push(`setPersistence:${persistence}`);
    return Promise.resolve();
  }),
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword.mockImplementation(() => {
    mocks.calls.push("signIn");
    return Promise.resolve({ user: { uid: "u1" } });
  }),
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword.mockImplementation(
    () => {
      mocks.calls.push("createUser");
      return Promise.resolve({ user: { uid: "u1", emailVerified: false } });
    },
  ),
  sendEmailVerification: mocks.sendEmailVerification.mockImplementation(() => {
    mocks.calls.push("sendEmailVerification");
    return Promise.resolve();
  }),
  sendPasswordResetEmail: mocks.sendPasswordResetEmail.mockResolvedValue(undefined),
  signOut: mocks.firebaseSignOut.mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

// --- Harness ----------------------------------------------------------------
function Harness() {
  const { user, loading, signIn, signUp } = useAuth();
  return (
    <div>
      <p data-testid="loading">{String(loading)}</p>
      <p data-testid="user">{user ? "signed-in" : "none"}</p>
      <button onClick={() => void signIn("a@b.com", "pw", true)}>SignIn Keep</button>
      <button onClick={() => void signIn("a@b.com", "pw", false)}>SignIn Session</button>
      <button onClick={() => void signUp("a@b.com", "pw", true)}>SignUp</button>
    </div>
  );
}

beforeEach(() => {
  calls.length = 0;
  mocks.authStateCallback = null;
  vi.clearAllMocks();
});

describe("AuthProvider", () => {
  it("starts loading, then resolves once onAuthStateChanged fires", async () => {
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    act(() => mocks.authStateCallback?.({ uid: "u1" }));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("user")).toHaveTextContent("signed-in");
  });

  it("sets local persistence BEFORE signing in when 'keep me signed in' is on", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await user.click(screen.getByText("SignIn Keep"));

    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled());
    expect(calls).toEqual(["setPersistence:LOCAL", "signIn"]);
  });

  it("uses session persistence when 'keep me signed in' is off", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await user.click(screen.getByText("SignIn Session"));

    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalled());
    expect(calls).toEqual(["setPersistence:SESSION", "signIn"]);
  });

  it("sends a verification email after creating the account on signup", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>,
    );
    await user.click(screen.getByText("SignUp"));

    await waitFor(() => expect(sendEmailVerification).toHaveBeenCalled());
    expect(calls).toEqual([
      "setPersistence:LOCAL",
      "createUser",
      "sendEmailVerification",
    ]);
  });
});
