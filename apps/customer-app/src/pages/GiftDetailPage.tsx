import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { giftToCartProduct, type Gift } from "@/types";
import { formatCents } from "@/lib/money";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductThumb } from "@/components/ProductThumb";

export function GiftDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [gift, setGift] = useState<Gift | null>(null);
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
      .get<Gift>(`/gifts/${id}`)
      .then((result) => {
        if (!cancelled) {
          setGift(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : "Could not load this gift.");
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
  if (loadError || !gift) {
    return <p className="py-12 text-center text-rose-600">{loadError ?? "Gift not found."}</p>;
  }

  const outOfStock = gift.quantityOnHand <= 0;

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-stone-200 bg-brand-50">
        <ProductThumb
          product={giftToCartProduct(gift)}
          imageClassName="h-full w-full object-cover"
          fallbackClassName="text-6xl"
        />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{gift.name}</h1>
        {gift.category && <p className="mt-1 text-sm capitalize text-stone-400">{gift.category}</p>}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xl font-semibold text-brand-800">
            {formatCents(gift.priceCents)}
          </span>
          {outOfStock && (
            <span className="inline-block rounded-full bg-rose-100 px-3 py-0.5 text-xs font-semibold text-rose-800">
              Out of stock
            </span>
          )}
        </div>
        <div className="mt-4">
          <AddToCartButton
            product={giftToCartProduct(gift)}
            outOfStock={outOfStock}
            className="px-5 py-2.5"
          />
        </div>
        {gift.description && <p className="mt-4 text-stone-700">{gift.description}</p>}
      </div>
    </div>
  );
}
