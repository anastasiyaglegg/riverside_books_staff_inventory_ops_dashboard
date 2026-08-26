import { Link } from "react-router-dom";
import type { CartProduct } from "@/types";
import { formatCents } from "@/lib/money";
import { ProductThumb } from "@/components/ProductThumb";
import { AddToCartButton } from "@/components/AddToCartButton";

// Catalog card for gifts and cards. `product.kind` is always "gift" or "card" here,
// which doubles as the route segment (gift -> /gifts/:id, card -> /cards/:id). No
// favorites yet, unlike BookCard. `outOfStock` comes from the catalog's inline
// quantityOnHand.
export function MerchCard({
  product,
  outOfStock,
}: {
  product: CartProduct;
  outOfStock: boolean;
}) {
  return (
    <Link
      to={`/${product.kind}s/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-[3/4] items-center justify-center bg-brand-50">
        <ProductThumb
          product={product}
          imageClassName="h-full w-full object-cover"
          fallbackClassName="text-4xl"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-2 font-semibold text-stone-900">{product.name}</p>
        {product.subtitle && <p className="text-sm capitalize text-stone-500">{product.subtitle}</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-semibold text-brand-800">{formatCents(product.priceCents)}</span>
          {outOfStock && (
            <span className="inline-block rounded-full bg-rose-100 px-3 py-0.5 text-xs font-semibold text-rose-800">
              Out of stock
            </span>
          )}
        </div>
        <AddToCartButton product={product} outOfStock={outOfStock} className="mt-3 w-full" />
      </div>
    </Link>
  );
}
