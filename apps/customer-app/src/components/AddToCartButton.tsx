import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { CartProduct } from "@/types";

// Adds a product to the cart with brief "Added" feedback. Isolates its click so it works
// inside a card <Link>. Disabled when out of stock.
export function AddToCartButton({
  product,
  outOfStock = false,
  className = "",
}: {
  product: CartProduct;
  outOfStock?: boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={outOfStock}
      className={`rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-default disabled:bg-stone-300 ${className}`}
    >
      {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
