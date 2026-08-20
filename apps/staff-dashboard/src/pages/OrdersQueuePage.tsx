import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import type { Order, OrderStatus } from "@/types";

// Mirrors lib/orders.ts on the backend, for UI affordance only -- the backend is the
// source of truth and re-validates every transition server-side.
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  placed: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  ready_for_pickup: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrdersQueuePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Order[]>("/orders");
      setOrders(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function changeStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);
    try {
      const updated = await api.patch<Order>(`/orders/${orderId}/status`, {
        status,
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update order status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const queue = orders
    .filter((o) => o.status === "placed" || o.status === "ready_for_pickup")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  return (
    <div className="page">
      <h1>Pre-Order Queue</h1>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : queue.length === 0 ? (
        <p>No pending pre-orders.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Placed</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{order.customer?.name ?? "—"}</td>
                <td>{order.customer?.email ?? order.customer?.phone ?? "—"}</td>
                <td>
                  {order.items
                    ?.map(
                      (item) =>
                        `${item.quantity}× ${item.book?.title ?? item.bookId}`,
                    )
                    .join(", ")}
                </td>
                <td>{formatCents(order.totalCents)}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td className="action-buttons">
                  {NEXT_STATUSES[order.status].map((next) => (
                    <button
                      key={next}
                      className="btn btn-secondary"
                      disabled={updatingId === order.id}
                      onClick={() => void changeStatus(order.id, next)}
                    >
                      {updatingId === order.id
                        ? "…"
                        : `Mark ${STATUS_LABELS[next]}`}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
