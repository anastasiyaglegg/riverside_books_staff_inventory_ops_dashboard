import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useCustomer } from "@/lib/customer-context";
import { bookToCartProduct, customerFullName, type Book, type Order } from "@/types";
import { formatCents } from "@/lib/money";
import { StockBadge } from "@/components/StockBadge";
import { AddToCartButton } from "@/components/AddToCartButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { BookCover } from "@/components/BookCover";
import { GuestContactFields, type GuestContact } from "@/components/GuestContactFields";

const EMPTY_CONTACT: GuestContact = { name: "", email: "", phone: "" };

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customer, adopt } = useCustomer();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .get<Book>(`/books/${id}`)
      .then((result) => {
        if (!cancelled) {
          setBook(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : "Could not load this title.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handlePreOrderSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!book) {
      return;
    }
    setSubmitError(null);

    if (!customer && !contact.email.trim() && !contact.phone.trim()) {
      setSubmitError("Add an email or phone number so the store can reach you.");
      return;
    }

    setSubmitting(true);
    try {
      // POST /orders finds-or-creates the customer server-side by email/phone, so
      // guest checkout is one request -- no separate "create customer" step needed.
      const order = await api.post<Order>("/orders", {
        customerName: customer ? customerFullName(customer) : contact.name.trim(),
        ...(customer?.email || contact.email.trim()
          ? { customerEmail: customer?.email ?? contact.email.trim() }
          : {}),
        ...(customer?.phone || contact.phone.trim()
          ? { customerPhone: customer?.phone ?? contact.phone.trim() }
          : {}),
        items: [{ bookId: book.id, quantity }],
      });

      if (order.customer) {
        adopt(order.customer);
      }
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : "Couldn't place the pre-order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-stone-500">Loading…</p>;
  }
  if (loadError || !book) {
    return <p className="py-12 text-center text-rose-600">{loadError ?? "Title not found."}</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-brand-50">
        <BookCover book={book} imageClassName="h-full w-full object-cover" fallbackClassName="text-6xl" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{book.title}</h1>
        <p className="mt-1 text-stone-500">by {book.author}</p>
        {book.category && (
          <p className="mt-1 text-sm capitalize text-stone-400">{book.category}</p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xl font-semibold text-brand-800">
            {formatCents(book.priceCents)}
          </span>
          <StockBadge status={book.inventory?.status} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <AddToCartButton
            product={bookToCartProduct(book)}
            outOfStock={book.inventory?.status === "out_of_stock"}
            className="px-5 py-2.5"
          />
          <FavoriteButton book={book} />
          <span className="text-sm text-stone-400">Add to cart to pay online at checkout.</span>
        </div>
        {book.description && <p className="mt-4 text-stone-700">{book.description}</p>}

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Pre-order for pickup</h2>
          <p className="mt-1 text-sm text-stone-500">
            Pay in store at pickup. We'll let you know when it's ready.
          </p>

          <form className="mt-4 flex flex-col gap-3" onSubmit={handlePreOrderSubmit}>
            <label htmlFor="quantity" className="text-sm font-medium text-stone-700">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-9 w-9 rounded-lg border border-stone-300 text-lg leading-none text-stone-600 hover:bg-stone-50"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                −
              </button>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                className="w-16 rounded-lg border border-stone-300 px-2 py-2 text-center text-sm"
              />
              <button
                type="button"
                className="h-9 w-9 rounded-lg border border-stone-300 text-lg leading-none text-stone-600 hover:bg-stone-50"
                onClick={() => setQuantity((current) => current + 1)}
              >
                +
              </button>
            </div>

            {customer ? (
              <p className="text-sm text-stone-500">
                Ordering as {customerFullName(customer)} ({customer.email ?? customer.phone}).
              </p>
            ) : (
              <GuestContactFields contact={contact} onChange={setContact} idPrefix="preorder" />
            )}

            {submitError && <p className="text-sm text-rose-600">{submitError}</p>}

            <button
              type="submit"
              className="mt-2 self-start rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Placing pre-order…" : "Place Pre-Order"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
