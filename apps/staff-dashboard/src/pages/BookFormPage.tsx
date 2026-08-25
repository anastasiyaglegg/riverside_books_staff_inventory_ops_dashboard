import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { dollarsToCents } from "@/lib/money";
import type { Book } from "@/types";

type FormState = {
  title: string;
  author: string;
  isbn: string;
  price: string;
  category: string;
  description: string;
  imageUrl: string;
  rating: string;
  quantityOnHand: string;
  reorderThreshold: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  author: "",
  isbn: "",
  price: "",
  category: "",
  description: "",
  imageUrl: "",
  rating: "",
  quantityOnHand: "0",
  reorderThreshold: "2",
};

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .get<Book>(`/books/${id}`)
      .then((book) => {
        setForm({
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? "",
          price: (book.priceCents / 100).toString(),
          category: book.category ?? "",
          description: book.description ?? "",
          imageUrl: book.imageUrl ?? "",
          rating: book.rating !== null ? String(book.rating) : "",
          quantityOnHand: String(book.inventory?.quantityOnHand ?? 0),
          reorderThreshold: String(book.inventory?.reorderThreshold ?? 2),
        });
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load book"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && id) {
        await api.patch<Book>(`/books/${id}`, {
          title: form.title,
          author: form.author,
          isbn: form.isbn || null,
          priceCents: dollarsToCents(form.price),
          category: form.category || null,
          description: form.description || null,
          imageUrl: form.imageUrl || null,
          rating: form.rating === "" ? null : Number(form.rating),
        });
      } else {
        await api.post<Book>("/books", {
          title: form.title,
          author: form.author,
          isbn: form.isbn || undefined,
          priceCents: dollarsToCents(form.price),
          category: form.category || undefined,
          description: form.description || undefined,
          imageUrl: form.imageUrl || undefined,
          rating: form.rating === "" ? undefined : Number(form.rating),
          quantityOnHand: Number(form.quantityOnHand),
          reorderThreshold: Number(form.reorderThreshold),
        });
      }
      navigate("/inventory");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save book");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="page-loading">Loading…</p>;
  }

  return (
    <div className="page">
      <h1>{isEdit ? "Edit Book" : "Add Book"}</h1>
      <form className="form" onSubmit={(e) => void handleSubmit(e)}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
        />

        <label htmlFor="author">Author</label>
        <input
          id="author"
          required
          value={form.author}
          onChange={(e) => set("author", e.target.value)}
        />

        <label htmlFor="isbn">ISBN</label>
        <input
          id="isbn"
          value={form.isbn}
          onChange={(e) => set("isbn", e.target.value)}
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

        <label htmlFor="category">Category</label>
        <input
          id="category"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
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

        <label htmlFor="rating">Rating (0-5, optional)</label>
        <input
          id="rating"
          type="number"
          min={0}
          max={5}
          step="0.1"
          value={form.rating}
          onChange={(e) => set("rating", e.target.value)}
        />

        {!isEdit && (
          <>
            <label htmlFor="quantityOnHand">Initial Quantity on Hand</label>
            <input
              id="quantityOnHand"
              type="number"
              min={0}
              value={form.quantityOnHand}
              onChange={(e) => set("quantityOnHand", e.target.value)}
            />

            <label htmlFor="reorderThreshold">Reorder Threshold</label>
            <input
              id="reorderThreshold"
              type="number"
              min={0}
              value={form.reorderThreshold}
              onChange={(e) => set("reorderThreshold", e.target.value)}
            />
          </>
        )}

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
