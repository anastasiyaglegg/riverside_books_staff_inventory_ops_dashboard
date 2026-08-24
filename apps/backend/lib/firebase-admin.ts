import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

// The service account JSON (Firebase console -> Project settings -> Service accounts ->
// Generate new private key) is a backend-only secret, stored as a single env var. We
// parse it lazily so public routes and tests never require it -- same discipline as the
// Supabase admin client in lib/auth.ts.
function getFirebaseApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY must be set to verify customer sessions");
  }
  let serviceAccount: Record<string, unknown>;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

/**
 * Verifies a Firebase ID token via the Admin SDK. `checkRevoked: true` rejects tokens
 * for users who have been disabled or force-signed-out -- worth the extra round-trip
 * for an auth path that will soon guard payment-linked records. Returns the decoded
 * claims, or null if the token is missing/invalid/revoked.
 */
export async function verifyFirebaseIdToken(token: string): Promise<DecodedIdToken | null> {
  try {
    return await getAuth(getFirebaseApp()).verifyIdToken(token, true);
  } catch {
    return null;
  }
}
