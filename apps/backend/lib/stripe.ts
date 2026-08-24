import Stripe from "stripe";

// Lazily instantiate a Stripe client (the SDK's instance pattern -- never the deprecated
// global-key pattern). Loaded from a backend-only key so public routes and tests that
// don't touch payments never require it. Prefer a restricted key (rk_test_...) over a
// full secret key.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (client) {
    return client;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY must be set to process payments");
  }
  client = new Stripe(key);
  return client;
}

// Where Stripe returns the browser after embedded checkout completes. The frontend's
// /checkout/return page reads ?session_id to show the outcome.
export function checkoutReturnUrl(): string {
  const origin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
  return `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;
}
