import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { StorePolicy } from "@/types";

export function PoliciesPage() {
  const [policies, setPolicies] = useState<StorePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPolicies(await api.get<StorePolicy[]>("/policies"));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load policies",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(key: string) {
    const value = drafts[key];
    if (value === undefined) return;
    setSavingKey(key);
    setError(null);
    try {
      const updated = await api.patch<StorePolicy>(`/policies/${key}`, {
        value,
      });
      setPolicies((prev) => prev.map((p) => (p.key === key ? updated : p)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update policy",
      );
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="page">
      <h1>Store Policies</h1>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="form">
          {policies.map((policy) => (
            <div key={policy.key} className="policy-row">
              <label htmlFor={`policy-${policy.key}`}>{policy.key}</label>
              <textarea
                id={`policy-${policy.key}`}
                value={drafts[policy.key] ?? policy.value}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [policy.key]: e.target.value,
                  }))
                }
              />
              <button
                className="btn btn-secondary"
                disabled={
                  drafts[policy.key] === undefined || savingKey === policy.key
                }
                onClick={() => void save(policy.key)}
              >
                {savingKey === policy.key ? "Saving…" : "Save"}
              </button>
            </div>
          ))}
          {policies.length === 0 && <p>No policies configured yet.</p>}
        </div>
      )}
    </div>
  );
}
