import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Customer, Inventory, Order } from "@/types";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // treat Monday as start of week
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function WeeklySnapshotPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ordersData, inventoryData, customersData] = await Promise.all([
          api.get<Order[]>("/orders"),
          api.get<Inventory[]>("/inventory"),
          api.get<Customer[]>("/customers"),
        ]);
        setOrders(ordersData);
        setInventory(inventoryData);
        setCustomers(customersData);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load snapshot data",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const preOrdersThisWeek = orders.filter(
    (o) => new Date(o.createdAt) >= weekStart,
  ).length;
  const lowStockCount = inventory.filter((i) => i.status !== "in_stock").length;
  const newSignUpsThisMonth = customers.filter(
    (c) => new Date(c.createdAt) >= monthStart,
  ).length;

  return (
    <div className="page">
      <h1>Weekly Snapshot</h1>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="snapshot-cards">
          <div className="snapshot-card">
            <span className="snapshot-value">{preOrdersThisWeek}</span>
            <span className="snapshot-label">Pre-orders this week</span>
          </div>
          <div className="snapshot-card">
            <span className="snapshot-value">{lowStockCount}</span>
            <span className="snapshot-label">Titles needing reorder</span>
          </div>
          <div className="snapshot-card">
            <span className="snapshot-value">{newSignUpsThisMonth}</span>
            <span className="snapshot-label">
              New loyalty sign-ups this month
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
