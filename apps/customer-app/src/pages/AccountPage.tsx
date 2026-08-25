import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCustomer } from "@/lib/customer-context";
import { STAMPS_PER_REWARD } from "@/lib/loyalty";
import { customerFullName, type Order } from "@/types";
import { OrderRow } from "@/components/OrderRow";

// Shown only when GET /customers/me refused to link (403 EMAIL_NOT_VERIFIED): an account
// already exists for this email, and the backend won't hand it over until the Firebase
// email is verified. Not a reconnect form anymore -- the linking is automatic once the
// email is confirmed, so we just nudge verification.
function VerifyEmailCard() {
  const { user, resendVerification } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    setStatus("sending");
    try {
      await resendVerification();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">Verify your email to continue</h2>
      <p className="mt-1 text-sm text-stone-500">
        An account already exists for {user?.email}. For your security, confirm your email
        to link it — then your loyalty stamps and pre-order history restore automatically.
      </p>
      {status === "sent" ? (
        <p className="mt-4 text-sm font-medium text-emerald-700">
          Verification email sent. Click the link, then reload this page.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === "sending"}
          className="mt-4 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Resend verification email"}
        </button>
      )}
      {status === "error" && (
        <p className="mt-2 text-sm text-rose-600">Couldn't send. Please try again shortly.</p>
      )}
    </div>
  );
}

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
  // loading" from "blocked on email verification (403)" from "failed".
  const [meStatus, setMeStatus] = useState<"loading" | "resolved" | "unverified" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!user) {
      return;
    }
    let cancelled = false;
    setMeStatus("loading");
    // Firebase-authed self-lookup: links the uid to the backend record (verified email)
    // or creates it, and returns fresh loyalty/order data -- the cross-device restore.
    loadMe()
      .then((result) => {
        if (!cancelled) {
          setMeStatus(result ? "resolved" : "unverified");
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
  // /customers/me is still resolving, was refused (unverified email), or errored.
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
        {meStatus === "unverified" ? (
          <VerifyEmailCard />
        ) : meStatus === "error" ? (
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

  const stampProgress = Math.min(customer.loyaltyStampCount / STAMPS_PER_REWARD, 1) * 100;

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

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Loyalty Stamps</h2>
        <p className="mt-2 text-3xl font-bold text-brand-800">
          {customer.loyaltyStampCount}{" "}
          <span className="text-base font-medium text-stone-400">/ {STAMPS_PER_REWARD}</span>
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${stampProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-stone-500">
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

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Pre-Order History</h2>
        <div className="mt-2">
          <OrderHistory customerId={customer.id} />
        </div>
      </div>
    </div>
  );
}
