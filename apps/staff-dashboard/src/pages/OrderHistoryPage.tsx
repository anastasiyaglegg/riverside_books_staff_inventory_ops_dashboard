import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import {
  customerFullName,
  orderItemProductName,
  type Order,
  type OrderStatus,
} from "@/types";

const STATUS_FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "placed", label: "Placed" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Unpaid",
  paid_online: "Paid Online",
  pay_in_store: "Pay in Store",
};

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

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

  const visibleOrders = orders
    .filter((o) => statusFilter === "all" || o.status === statusFilter)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Order History</h1>
      </div>

      <label className="filter-toggle">
        Status
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "all")
          }
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : visibleOrders.length === 0 ? (
        <p>No orders match this filter.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Placed</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleOrders.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>
                  {order.customer ? customerFullName(order.customer) : "—"}
                </td>
                <td>{order.customer?.email ?? order.customer?.phone ?? "—"}</td>
                <td>
                  {order.items
                    ?.map(
                      (item) =>
                        `${item.quantity}× ${orderItemProductName(item)}`,
                    )
                    .join(", ")}
                </td>
                <td>{formatCents(order.totalCents)}</td>
                <td>{PAYMENT_LABELS[order.paymentStatus]}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
