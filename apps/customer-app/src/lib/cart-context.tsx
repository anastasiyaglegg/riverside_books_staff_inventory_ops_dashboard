import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { bookToCartProduct, type Book, type CartProduct } from "@/types";

const STORAGE_KEY = "riverside_cart";

// We snapshot the product for display so the cart renders without refetching. The actual
// charge is always re-priced server-side at checkout from the catalog's priceCents, so a
// stale snapshot price here is cosmetic only.
export type CartItem = { product: CartProduct; quantity: number };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  addItem: (product: CartProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// A cart line persisted before gifts/cards existed stored the raw book as `{ book }`.
// Migrate those forward so a returning shopper's cart survives the upgrade instead of
// silently emptying; drop anything we can't recognize.
function normalizeStoredItem(raw: unknown): CartItem | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const entry = raw as { product?: CartProduct; book?: Book; quantity?: unknown };
  const quantity = typeof entry.quantity === "number" && entry.quantity > 0 ? entry.quantity : null;
  if (!quantity) {
    return null;
  }
  if (entry.product && typeof entry.product.id === "string" && entry.product.kind) {
    return { product: entry.product, quantity };
  }
  if (entry.book && typeof entry.book.id === "string") {
    return { product: bookToCartProduct(entry.book), quantity };
  }
  return null;
}

function loadStoredCart(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(normalizeStoredItem).filter((item): item is CartItem => item !== null);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadStoredCart());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Product ids are UUIDs from three separate tables; a collision across catalogs is
  // effectively impossible, so a line is identified by id alone.
  function addItem(product: CartProduct, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }

  function clear() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce((sum, i) => sum + i.product.priceCents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotalCents, addItem, setQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
