import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

type SessionStatus = {
  status: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  orderId: string | null;
};

export function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const { clear } = useCart();
  const [result, setResult] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await api.get<SessionStatus>(`/checkout/session?session_id=${sessionId}`);
        if (cancelled) return;
        setResult(data);
        setLoading(false);
        if (data.paymentStatus === "paid" && !clearedRef.current) {
          // Payment succeeded -- empty the cart once.
          clearedRef.current = true;
          clear();
        }
        // The order is written by the webhook, which can lag a beat -- retry a few times
        // to pick up the orderId so we can link to it.
        if (data.paymentStatus === "paid" && !data.orderId && attempts < 5) {
          attempts += 1;
          setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't confirm your payment. Please check your account for the order.");
          setLoading(false);
        }
      }
    }
    void poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return <p className="text-sm text-stone-500">Confirming your payment…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-rose-600">{error}</p>
        <Link to="/cart" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          Back to cart
        </Link>
      </div>
    );
  }

  const paid = result?.paymentStatus === "paid";

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center">
      {paid ? (
        <>
          <p className="text-4xl">🎉</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Payment complete</h1>
          <p className="mt-2 text-sm text-stone-500">
            Thanks{result?.customerEmail ? `, we've emailed a receipt to ${result.customerEmail}` : ""}.
            Your pre-order is being prepared for pickup.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {result?.orderId ? (
              <Link
                to={`/orders/${result.orderId}`}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                View your order
              </Link>
            ) : (
              <p className="text-xs text-stone-400">Finalizing your order…</p>
            )}
            <Link to="/catalog" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              Continue shopping
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-stone-900">Payment not completed</h1>
          <p className="mt-2 text-sm text-stone-500">Your card was not charged.</p>
          <Link
            to="/checkout"
            className="mt-6 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Try again
          </Link>
        </>
      )}
    </div>
  );
}
