import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { dollarsToCents } from "@/lib/money";
import type { Card } from "@/types";

type FormState = {
  title: string;
  price: string;
  occasion: string;
  description: string;
  imageUrl: string;
  quantityOnHand: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  price: "",
  occasion: "",
  description: "",
  imageUrl: "",
  quantityOnHand: "0",
};

export function CardFormPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post<Card>("/cards", {
        title: form.title,
        priceCents: dollarsToCents(form.price),
        occasion: form.occasion || undefined,
        description: form.description || undefined,
        imageUrl: form.imageUrl || undefined,
        quantityOnHand: Number(form.quantityOnHand),
      });
      navigate("/inventory/cards");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save card");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Add Card</h1>
      <form className="form" onSubmit={(e) => void handleSubmit(e)}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />

        <label htmlFor="price">Price (USD)</label>
        <input
          id="price"
          type="number"
          min={0}
          step="0.01"
          required
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
        />

        <label htmlFor="occasion">Occasion</label>
        <input
          id="occasion"
          value={form.occasion}
          onChange={(e) => set("occasion", e.target.value)}
        />

        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <label htmlFor="imageUrl">Image URL</label>
        <input
          id="imageUrl"
          value={form.imageUrl}
          onChange={(e) => set("imageUrl", e.target.value)}
        />

        <label htmlFor="quantityOnHand">Initial Quantity on Hand</label>
        <input
          id="quantityOnHand"
          type="number"
          min={0}
          value={form.quantityOnHand}
          onChange={(e) => set("quantityOnHand", e.target.value)}
        />

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
