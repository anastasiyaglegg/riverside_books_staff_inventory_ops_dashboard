import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import type { Inventory } from "@/types";

export function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsReorderOnly, setNeedsReorderOnly] = useState(false);
  const [pendingQuantities, setPendingQuantities] = useState<
    Record<string, string>
  >({});
  const [savingBookId, setSavingBookId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<Inventory[]>("/inventory");
      setItems(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load inventory",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveQuantity(bookId: string) {
    const raw = pendingQuantities[bookId];
    if (raw === undefined) return;
    const quantityOnHand = Number(raw);
    if (!Number.isInteger(quantityOnHand) || quantityOnHand < 0) {
      setError("Quantity must be a non-negative whole number");
      return;
    }
    setSavingBookId(bookId);
    setError(null);
    try {
      const updated = await api.patch<Inventory>(`/inventory/${bookId}`, {
        quantityOnHand,
      });
      setItems((prev) =>
        prev.map((item) => (item.bookId === bookId ? updated : item)),
      );
      setPendingQuantities((prev) => {
        const next = { ...prev };
        delete next[bookId];
        return next;
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update quantity",
      );
    } finally {
      setSavingBookId(null);
    }
  }

  const visibleItems = needsReorderOnly
    ? items.filter((i) => i.status !== "in_stock")
    : items;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Inventory</h1>
        <Link className="btn btn-primary" to="/books/new">
          Add Book
        </Link>
      </div>

      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={needsReorderOnly}
          onChange={(e) => setNeedsReorderOnly(e.target.checked)}
        />
        Needs Reorder only
      </label>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Quantity on Hand</th>
              <th>Reorder Threshold</th>
              <th>Status</th>
              <th>Last Adjusted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.book ? (
                    <Link to={`/books/${item.book.id}/edit`}>
                      {item.book.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{item.book?.author ?? "—"}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className="qty-input"
                    value={
                      pendingQuantities[item.bookId] ?? item.quantityOnHand
                    }
                    onChange={(e) =>
                      setPendingQuantities((prev) => ({
                        ...prev,
                        [item.bookId]: e.target.value,
                      }))
                    }
                  />
                </td>
                <td>{item.reorderThreshold}</td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  {item.lastAdjustedBy
                    ? `${item.lastAdjustedBy.name} — ${new Date(item.updatedAt).toLocaleString()}`
                    : "—"}
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    disabled={
                      pendingQuantities[item.bookId] === undefined ||
                      savingBookId === item.bookId
                    }
                    onClick={() => void saveQuantity(item.bookId)}
                  >
                    {savingBookId === item.bookId ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
            {visibleItems.length === 0 && (
              <tr>
                <td colSpan={7}>No items match this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
