import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthContextValue = {
  // The Firebase credential/session user -- identity only (email, uid, emailVerified).
  // Loyalty/orders data lives in customer-context, joined by email. See AccountPage.
  user: User | null;
  // True until the first onAuthStateChanged fires, so guards can show a spinner instead
  // of flashing the login screen for an already-signed-in returning visitor.
  loading: boolean;
  signIn: (email: string, password: string, keepSignedIn: boolean) => Promise<void>;
  signUp: (email: string, password: string, keepSignedIn: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Persistence must be set BEFORE the sign-in call, or Firebase applies the default
// (local) to the session that call creates. "Keep me signed in" -> local (survives a
// browser restart); unchecked -> session (cleared when the tab/window closes).
async function applyPersistence(keepSignedIn: boolean): Promise<void> {
  await setPersistence(
    auth,
    keepSignedIn ? browserLocalPersistence : browserSessionPersistence,
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string, keepSignedIn: boolean) {
    await applyPersistence(keepSignedIn);
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string, keepSignedIn: boolean) {
    await applyPersistence(keepSignedIn);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Fire-and-forget the verification email; a failure here (e.g. rate limit) must not
    // block account creation -- the soft banner lets them resend later.
    void sendEmailVerification(credential.user).catch(() => undefined);
    return credential.user;
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function resendVerification() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
