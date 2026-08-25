import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCents } from "@/lib/money";
import type { Card, Gift } from "@/types";

// Gifts and cards both track stock inline via quantityOnHand (no Inventory row like books),
// so this normalizes the two catalogs into one row shape and one editable table. Kind
// decides which endpoint a save PATCHes.
type MerchItem = {
  kind: "gift" | "card";
  id: string;
  name: string;
  group: string | null; // gift.category | card.occasion
  priceCents: number;
  quantityOnHand: number;
};

function giftToMerch(gift: Gift): MerchItem {
  return {
    kind: "gift",
    id: gift.id,
    name: gift.name,
    group: gift.category,
    priceCents: gift.priceCents,
    quantityOnHand: gift.quantityOnHand,
  };
}

function cardToMerch(card: Card): MerchItem {
  return {
    kind: "card",
    id: card.id,
    name: card.title,
    group: card.occasion,
    priceCents: card.priceCents,
    quantityOnHand: card.quantityOnHand,
  };
}

export function MerchandisePage() {
  const [items, setItems] = useState<MerchItem[]>([]);
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
      const [gifts, cards] = await Promise.all([
        api.get<Gift[]>("/gifts"),
        api.get<Card[]>("/cards"),
      ]);
      const merged = [
        ...gifts.map(giftToMerch),
        ...cards.map(cardToMerch),
      ].sort((a, b) => a.name.localeCompare(b.name));
      setItems(merged);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load merchandise",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveQuantity(item: MerchItem) {
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
      const path =
        item.kind === "gift" ? `/gifts/${item.id}` : `/cards/${item.id}`;
      const updated = await api.patch<Gift | Card>(path, { quantityOnHand });
      const next =
        item.kind === "gift"
          ? giftToMerch(updated as Gift)
          : cardToMerch(updated as Card);
      setItems((prev) => prev.map((i) => (i.id === item.id ? next : i)));
      setPendingQuantities((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
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
        <h1>Gifts &amp; Cards</h1>
      </div>

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
              <th>Type</th>
              <th>Group</th>
              <th>Price</th>
              <th>Quantity on Hand</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={`${item.kind}-${item.id}`}>
                <td>{item.name}</td>
                <td>{item.kind === "gift" ? "Gift" : "Card"}</td>
                <td>{item.group ?? "—"}</td>
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
                <td colSpan={7}>No items match this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
