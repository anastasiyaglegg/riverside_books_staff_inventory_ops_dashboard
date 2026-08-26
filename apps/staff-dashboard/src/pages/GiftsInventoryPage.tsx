import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { InventoryTabs } from "@/components/InventoryTabs";
import { formatCents } from "@/lib/money";
import type { Gift } from "@/types";

export function GiftsInventoryPage() {
  const [items, setItems] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReorderOnly, setNeedsReorderOnly] = useState(false);
  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, string>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const gifts = await api.get<Gift[]>("/gifts");
      setItems([...gifts].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load gifts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveQuantity(item: Gift) {
    const raw = pendingQuantities[item.id];
    if (raw === undefined) return;
    const quantityOnHand = Number(raw);
    if (!Number.isInteger(quantityOnHand) || quantityOnHand < 0) {
      setError("Quantity must be a non-negative whole number");
      return;
    }
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await api.patch<Gift>(`/gifts/${item.id}`, {
        quantityOnHand,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setPendingQuantities((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update quantity",
      );
    } finally {
      setSavingId(null);
    }
  }

  const visibleItems = needsReorderOnly
    ? items.filter((i) => i.quantityOnHand <= 0)
    : items;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory</h1>
        <Link className="btn btn-primary" to="/gifts/new">
          Add Gift
        </Link>
      </div>

      <InventoryTabs />

      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={needsReorderOnly}
          onChange={(e) => setNeedsReorderOnly(e.target.checked)}
        />
        Out of stock only
      </label>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Quantity on Hand</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category ?? "—"}</td>
                <td>{formatCents(item.priceCents)}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="qty-input"
                    value={pendingQuantities[item.id] ?? item.quantityOnHand}
                    onChange={(e) =>
                      setPendingQuantities((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                  />
                </td>
                <td>
                  <StatusBadge
                    status={
                      item.quantityOnHand <= 0 ? "out_of_stock" : "in_stock"
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    disabled={
                      pendingQuantities[item.id] === undefined ||
                      savingId === item.id
                    }
                    onClick={() => void saveQuantity(item)}
                  >
                    {savingId === item.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={6}>No items match this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
