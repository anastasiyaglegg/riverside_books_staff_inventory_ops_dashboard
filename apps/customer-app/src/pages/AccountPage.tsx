import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCustomer } from "@/lib/customer-context";
import { STAMPS_PER_REWARD } from "@/lib/loyalty";
import { customerFullName, type Order } from "@/types";
import { OrderRow } from "@/components/OrderRow";

function OrderHistory({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    // GET /orders?customerId= is public self-service scope -- no staff session
    // needed when a customerId is present (see apps/backend CLAUDE.md).
    api
      .get<Order[]>(`/orders?customerId=${customerId}`)
      .then((result) => {
        if (!cancelled) {
          setOrders(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError ? error.message : "Couldn't load your order history.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return <p className="text-sm text-stone-500">Loading order history…</p>;
  }
  if (errorMessage) {
    return <p className="text-sm text-rose-600">{errorMessage}</p>;
  }
  if (orders.length === 0) {
    return <p className="text-sm text-stone-500">No pre-orders yet.</p>;
  }

  // Preview: the 3 most recent (backend returns oldest-first), with a link to the full
  // Orders page for everything else.
  const recent = [...orders].reverse().slice(0, 3);

  return (
    <div className="flex flex-col gap-1">
      <div className="divide-y divide-stone-100">
        {recent.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </div>
      <Link
        to="/orders"
        className="mt-1 self-start px-3 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        View all orders →
      </Link>
    </div>
  );
}

export function AccountPage() {
  const { user, signOut: signOutAuth } = useAuth();
  const { customer, signOut: signOutCustomer, loadMe } = useCustomer();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  // Tracks the GET /customers/me resolution so the no-customer view can tell "still
  // loading" from "failed".
  const [meStatus, setMeStatus] = useState<"loading" | "resolved" | "error">("loading");

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    setMeStatus("loading");
    // Firebase-authed self-lookup: links the uid to the backend record (or creates it)
    // and returns fresh loyalty/order data -- the cross-device restore.
    loadMe()
      .then(() => {
        if (!cancelled) {
          setMeStatus("resolved");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMeStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleLogout() {
    await signOutAuth();
    signOutCustomer();
    navigate("/login");
  }

  // Behind ProtectedRoute, so there's always a Firebase user. No customer record yet means
  // /customers/me is still resolving or errored.
  if (!customer) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">My Account</h1>
          <button
            type="button"
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
            onClick={() => void handleLogout()}
          >
            Log out
          </button>
        </div>
        {meStatus === "error" ? (
          <p className="text-sm text-rose-600">
            Couldn't load your account. Please reload the page.
          </p>
        ) : (
          <p className="text-sm text-stone-500">Loading your account…</p>
        )}
      </div>
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadMe();
    } catch {
      // Non-critical; the previously known stamp count stays on screen.
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">My Account</h1>
        <button
          type="button"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50"
          onClick={() => void handleLogout()}
        >
          Log out
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="font-medium text-stone-900">{customerFullName(customer)}</p>
        <p className="text-sm text-stone-500">{user?.email ?? customer.email ?? customer.phone}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Library-card styling per brand spec: Riverbed Navy header, Rose Blush hearts
            for earned stamps instead of a plain progress bar. */}
        <div className="flex items-center justify-between bg-brand-700 px-6 py-4 text-white">
          <h2 className="font-script text-2xl">Loyalty Stamps</h2>
          <p className="text-lg font-semibold">
            {customer.loyaltyStampCount}
            <span className="text-sm font-medium text-brand-200"> / {STAMPS_PER_REWARD}</span>
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-1.5" aria-hidden="true">
            {Array.from({ length: STAMPS_PER_REWARD }, (_, index) => (
              <span
                key={index}
                className={`text-2xl leading-none ${
                  index < customer.loyaltyStampCount ? "text-rose-600" : "text-stone-200"
                }`}
              >
                {index < customer.loyaltyStampCount ? "♥" : "♡"}
              </span>
            ))}
          </div>
          <p className="sr-only">
            {customer.loyaltyStampCount} of {STAMPS_PER_REWARD} stamps earned
          </p>
          <p className="mt-4 text-sm text-stone-500">
            Earn a stamp with every purchase — we add it automatically once your order is
            completed, whether you paid online or picked up in store. Collect {STAMPS_PER_REWARD}{" "}
            stamps for a free reward — ask staff to redeem it at checkout.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 disabled:cursor-default disabled:opacity-50"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Pre-Order History</h2>
        <div className="mt-2">
          <OrderHistory customerId={customer.id} />
        </div>
      </div>
    </div>
  );
}
