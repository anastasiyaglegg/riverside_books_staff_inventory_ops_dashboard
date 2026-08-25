"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";

// Optional identity layer. Chat is anonymous-allowed by default (see
// components/ChatWidget.tsx, which generates its own session_id and never
// requires any of this). Guarded so local/dev/test runs work fine without a
// Firebase project configured.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!auth) {
    auth = getAuth(app);
  }
  return auth;
}

/** Optional anonymous identity. Chat works fine without ever calling this. */
export async function signInOptional(): Promise<User | null> {
  const authInstance = getFirebaseAuth();
  if (!authInstance) return null;
  try {
    const result = await signInAnonymously(authInstance);
    return result.user;
  } catch (err) {
    console.warn("Firebase anonymous sign-in failed (chat still works anonymously):", err);
    return null;
  }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const authInstance = getFirebaseAuth();
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}
