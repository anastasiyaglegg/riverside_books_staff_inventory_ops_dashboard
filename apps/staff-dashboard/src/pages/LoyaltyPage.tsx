import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { customerFullName, type Customer } from "@/types";

const STAMPS_PER_REWARD = 10; // mirrors lib/loyalty.ts on the backend

export function LoyaltyPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [searching, setSearching] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const data = await api.get<Customer[]>(
        `/customers?q=${encodeURIComponent(query)}`,
      );
      setResults(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addStamp() {
    if (!selected) return;
    setActing(true);
    setError(null);
    try {
      const updated = await api.post<Customer>("/loyalty/earn", {
        customerId: selected.id,
      });
      setSelected(updated);
      setResults((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add stamp");
    } finally {
      setActing(false);
    }
  }

  async function redeemReward() {
    if (!selected) return;
    setActing(true);
    setError(null);
    try {
      const updated = await api.post<Customer>("/loyalty/redeem", {
        customerId: selected.id,
      });
      setSelected(updated);
      setResults((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to redeem reward",
      );
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="page">
      <h1>Loyalty Lookup</h1>
      <form className="search-form" onSubmit={(e) => void handleSearch(e)}>
        <input
          placeholder="Search by name, email, or phone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <div className="loyalty-layout">
        <ul className="result-list">
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                className={
                  selected?.id === customer.id
                    ? "result-item active"
                    : "result-item"
                }
                onClick={() => setSelected(customer)}
              >
                {customerFullName(customer)} — {customer.loyaltyStampCount}{" "}
                stamps
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="result-empty">No results yet.</li>
          )}
        </ul>

        {selected && (
          <div className="customer-detail">
            <h2>{customerFullName(selected)}</h2>
            <p>{selected.email ?? selected.phone ?? "No contact on file"}</p>
            <p className="stamp-count">
              {selected.loyaltyStampCount} / {STAMPS_PER_REWARD} stamps
            </p>
            <div className="action-buttons">
              <button
                className="btn btn-secondary"
                disabled={acting}
                onClick={() => void addStamp()}
              >
                Add Stamp
              </button>
              <button
                className="btn btn-primary"
                disabled={
                  acting || selected.loyaltyStampCount < STAMPS_PER_REWARD
                }
                onClick={() => void redeemReward()}
              >
                Redeem Reward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
