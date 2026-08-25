import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// All of these are public, browser-shipped values -- a Firebase web config is NOT a
// secret (it just identifies the project; security lives in Auth settings + rules).
// They still live in .env so the same build can target different Firebase projects.
const rawConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Warn (don't throw) if the project isn't configured yet. The public catalog/events
// pages -- and unit tests / CI, which have no .env -- must keep working without Firebase;
// only the auth flows need it, and those surface a friendly error when actually used.
const missing = Object.entries(rawConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  console.warn(
    `[firebase] Not configured -- missing env vars: ${missing.join(", ")}. ` +
      "Copy .env.example to .env.local and fill in your Firebase web config to enable login.",
  );
}

// Fall back to non-empty placeholders when unconfigured so initializeApp()/getAuth() don't
// throw at import (getAuth rejects an empty apiKey with auth/invalid-api-key, which would
// white-screen the whole SPA and break CI). Real auth calls with these placeholders fail
// gracefully -- which is correct when Firebase isn't set up.
const firebaseConfig = {
  apiKey: rawConfig.apiKey || "unconfigured",
  authDomain: rawConfig.authDomain || "unconfigured.firebaseapp.com",
  projectId: rawConfig.projectId || "unconfigured",
  storageBucket: rawConfig.storageBucket || "unconfigured.appspot.com",
  messagingSenderId: rawConfig.messagingSenderId || "0",
  appId: rawConfig.appId || "unconfigured",
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
