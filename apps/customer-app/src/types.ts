export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
// The store sells three catalogs. An order/cart line references exactly one.
export type ProductKind = "book" | "gift" | "card";
export type OrderStatus = "placed" | "ready_for_pickup" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid_online" | "pay_in_store";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type Inventory = {
  id: string;
  bookId: string;
  quantityOnHand: number;
  reorderThreshold: number;
  status: StockStatus;
  updatedAt: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  priceCents: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  inventory?: Inventory | null;
};

// Non-book merchandise. Mirrors the backend Gift model: stock is tracked inline via
// quantityOnHand (no separate Inventory table like books have).
export type Gift = {
  id: string;
  name: string;
  priceCents: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  quantityOnHand: number;
  createdAt: string;
  updatedAt: string;
};

// Greeting cards. Grouped by `occasion` rather than `category`; same inline-stock rule.
export type Card = {
  id: string;
  title: string;
  priceCents: number;
  occasion: string | null;
  description: string | null;
  imageUrl: string | null;
  quantityOnHand: number;
  createdAt: string;
  updatedAt: string;
};

// A cart line is normalized across the three catalogs so the cart, checkout, and order
// display don't each need book/gift/card branches. `subtitle` is the secondary label
// (author for books, category for gifts, occasion for cards). The real charge is always
// re-priced server-side at checkout, so `priceCents` here is a display snapshot.
export type CartProduct = {
  kind: ProductKind;
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  subtitle: string | null;
};

export function bookToCartProduct(book: Book): CartProduct {
  return {
    kind: "book",
    id: book.id,
    name: book.title,
    priceCents: book.priceCents,
    imageUrl: book.imageUrl,
    subtitle: book.author,
  };
}

export function giftToCartProduct(gift: Gift): CartProduct {
  return {
    kind: "gift",
    id: gift.id,
    name: gift.name,
    priceCents: gift.priceCents,
    imageUrl: gift.imageUrl,
    subtitle: gift.category,
  };
}

export function cardToCartProduct(card: Card): CartProduct {
  return {
    kind: "card",
    id: card.id,
    name: card.title,
    priceCents: card.priceCents,
    imageUrl: card.imageUrl,
    subtitle: card.occasion,
  };
}

// The `{ bookId | giftId | cardId }` shape POST /orders and /checkout/session expect --
// exactly one key set, matching the line's catalog.
export function cartProductToOrderItemRef(
  product: CartProduct,
): { bookId: string } | { giftId: string } | { cardId: string } {
  switch (product.kind) {
    case "book":
      return { bookId: product.id };
    case "gift":
      return { giftId: product.id };
    case "card":
      return { cardId: product.id };
  }
}

export type Customer = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  loyaltyStampCount: number;
  createdAt: string;
};

// lastName is optional (guest-checkout / one-name rows); render a single display name.
export function customerFullName(customer: Pick<Customer, "firstName" | "lastName">): string {
  return customer.lastName ? `${customer.firstName} ${customer.lastName}` : customer.firstName;
}

export type OrderItem = {
  id: string;
  orderId: string;
  // Exactly one of these is set, matching the line's catalog.
  bookId: string | null;
  giftId: string | null;
  cardId: string | null;
  quantity: number;
  unitPriceCents: number;
  book?: Book | null;
  gift?: Gift | null;
  card?: Card | null;
};

// Display name for an order line, whichever catalog it points at.
export function orderItemName(item: OrderItem): string {
  return item.book?.title ?? item.gift?.name ?? item.card?.title ?? "Item";
}

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OrderItem[];
};

export type StoreEvent = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  capacity: number | null;
  createdAt: string;
};

export type EventTicketStatus = "reserved" | "attended" | "cancelled";

export type EventTicket = {
  id: string;
  eventId: string;
  customerId: string;
  status: EventTicketStatus;
  createdAt: string;
  customer?: Customer;
  event?: StoreEvent;
};

export type StorePolicy = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
};
