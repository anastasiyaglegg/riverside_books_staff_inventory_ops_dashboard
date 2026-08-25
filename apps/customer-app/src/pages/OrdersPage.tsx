import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useCustomer } from "@/lib/customer-context";
import type { Order, OrderStatus } from "@/types";
import { OrderRow } from "@/components/OrderRow";

type Filter = OrderStatus | "all";

const TABS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersPage() {
  const { customer, loadMe } = useCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      // Behind ProtectedRoute, so there's a Firebase user; the customer record may not be
      // loaded on direct navigation, so resolve it via /customers/me first.
      let cust = customer;
      if (!cust) {
        try {
          cust = await loadMe();
        } catch {
          // fall through -- treated as "couldn't load" below
        }
      }
      if (cancelled) return;
      if (!cust) {
        // No customer (unverified email / nothing to show) -- render the empty state.
        setOrders([]);
        setLoading(false);
        return;
      }
      try {
        // Public self-service listing (includes items + books). Backend returns oldest
        // first -- reverse for newest-first.
        const result = await api.get<Order[]>(`/orders?customerId=${cust.id}`);
        if (!cancelled) {
          setOrders([...result].reverse());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load your orders.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countFor = (value: Filter) =>
    value === "all" ? orders.length : orders.filter((o) => o.status === value).length;
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-stone-900">My Orders</h1>

      {loading ? (
        <p className="text-sm text-stone-500">Loading your orders…</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-500">No orders yet.</p>
          <Link
            to="/catalog"
            className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.value
                    ? "bg-brand-700 text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:bg-brand-50 hover:text-brand-800"
                }`}
              >
                {tab.label} ({countFor(tab.value)})
              </button>
            ))}
          </div>

          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-stone-500">
                No {filter === "all" ? "" : TABS.find((t) => t.value === filter)?.label.toLowerCase()}{" "}
                orders.
              </p>
            ) : (
              filtered.map((order) => <OrderRow key={order.id} order={order} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
