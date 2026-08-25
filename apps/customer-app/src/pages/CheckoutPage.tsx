import { useCallback, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { api } from "@/lib/api";
import { cartProductToOrderItemRef } from "@/types";
import { useCart } from "@/lib/cart-context";
import { useCustomer } from "@/lib/customer-context";
import { useAuth } from "@/lib/auth-context";

// Choice shown to a logged-out shopper before payment: sign in (loyalty + saved details)
// or continue as guest (Stripe collects the email; the order links by that email).
function CheckoutChoice({
  onGuest,
  onLogin,
}: {
  onGuest: () => void;
  onLogin: () => void;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold text-stone-900">How would you like to check out?</h1>
      <p className="mt-2 text-sm text-stone-500">
        Log in to earn loyalty stamps and see this order in your account, or continue as a
        guest — you'll still get a receipt by email.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onLogin}
          className="rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Log in or create an account
        </button>
        <button
          type="button"
          onClick={onGuest}
          className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const { items } = useCart();
  const { customer } = useCustomer();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guestMode, setGuestMode] = useState(false);

  // Ask the backend to create the Checkout Session and hand back its client secret.
  // Sending only product refs + quantities -- the server prices the order. customerId
  // links the order to a signed-in customer; guests are matched by Stripe's email.
  const fetchClientSecret = useCallback(() => {
    return api
      .post<{ clientSecret: string }>("/checkout/session", {
        items: items.map((i) => ({ ...cartProductToOrderItemRef(i.product), quantity: i.quantity })),
        ...(customer?.id && { customerId: customer.id }),
      })
      .then((data) => data.clientSecret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  // Logged-out shoppers pick guest vs. sign-in first; logged-in ones go straight through.
  if (!user && !guestMode) {
    return (
      <CheckoutChoice
        onGuest={() => setGuestMode(true)}
        onLogin={() => navigate("/login", { state: { from: "/checkout" } })}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Checkout</h1>
        <span className="text-sm text-stone-500">
          {user
            ? `Signed in as ${customer?.email ?? user.email ?? "your account"}`
            : "Checking out as guest"}
        </span>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-2">
        <EmbeddedCheckoutProvider stripe={getStripePromise()} options={{ fetchClientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    </div>
  );
}
