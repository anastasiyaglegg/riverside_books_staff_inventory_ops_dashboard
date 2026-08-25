import { loadStripe, type Stripe } from "@stripe/stripe-js";

// The publishable key is a public, browser-safe value (like the Firebase web config).
// loadStripe returns a promise we memoize so Stripe.js loads once for the whole app.
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!publishableKey) {
    return Promise.reject(
      new Error(
        "Stripe is not configured -- set VITE_STRIPE_PUBLISHABLE_KEY in .env.local (pk_test_...).",
      ),
    );
  }
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}
