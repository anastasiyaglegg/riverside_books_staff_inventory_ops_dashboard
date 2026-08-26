import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { cardToCartProduct, type Card } from "@/types";
import { formatCents } from "@/lib/money";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductThumb } from "@/components/ProductThumb";

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .get<Card>(`/cards/${id}`)
      .then((result) => {
        if (!cancelled) {
          setCard(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : "Could not load this card.");
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

  if (loading) {
    return <p className="py-12 text-center text-stone-500">Loading…</p>;
  }
  if (loadError || !card) {
    return <p className="py-12 text-center text-rose-600">{loadError ?? "Card not found."}</p>;
  }

  const outOfStock = card.quantityOnHand <= 0;

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-brand-50">
        <ProductThumb
          product={cardToCartProduct(card)}
          imageClassName="h-full w-full object-cover"
          fallbackClassName="text-6xl"
        />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{card.title}</h1>
        {card.occasion && <p className="mt-1 text-sm capitalize text-stone-400">{card.occasion}</p>}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xl font-semibold text-brand-800">
            {formatCents(card.priceCents)}
          </span>
          {outOfStock && (
            <span className="inline-block rounded-full bg-rose-100 px-3 py-0.5 text-xs font-semibold text-rose-800">
              Out of stock
            </span>
          )}
        </div>
        <div className="mt-4">
          <AddToCartButton
            product={cardToCartProduct(card)}
            outOfStock={outOfStock}
            className="px-5 py-2.5"
          />
        </div>
        {card.description && <p className="mt-4 text-stone-700">{card.description}</p>}
      </div>
    </div>
  );
}
