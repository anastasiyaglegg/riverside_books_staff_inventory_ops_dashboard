// Mirrors PaginationMeta / buildPaginationMeta on the backend (lib/pagination.ts).
export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type OrderStatus =
  | "placed"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type Inventory = {
  id: string;
  bookId: string;
  quantityOnHand: number;
  reorderThreshold: number;
  status: StockStatus;
  lastAdjustedById: string | null;
  lastAdjustedBy?: { id: string; name: string } | null;
  updatedAt: string;
  book?: Book;
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
  // Staff-entered average rating, 0-5. Null until set -- feeds Product D's
  // marketing content generator, which skips a book while this is null
  // rather than invent one (see apps/backend/lib/marketing/catalog-mapper.ts).
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  inventory?: Inventory | null;
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  loyaltyStampCount: number;
  createdAt: string;
};

// Customers now have separate first/last names; lastName is optional (guest checkout /
// one-name rows). Use this everywhere a full display name is shown.
export function customerFullName(customer: {
  firstName: string;
  lastName: string | null;
}): string {
  return customer.lastName
    ? `${customer.firstName} ${customer.lastName}`
    : customer.firstName;
}

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

// An order line references exactly one of book/gift/card (mirrors the backend's
// OrderItem -- see CLAUDE.md "Database Schema").
export type OrderItem = {
  id: string;
  orderId: string;
  bookId: string | null;
  book?: Book | null;
  giftId: string | null;
  gift?: Gift | null;
  cardId: string | null;
  card?: Card | null;
  quantity: number;
  unitPriceCents: number;
};

// The product an order line refers to, whichever of the three it is.
export function orderItemProductName(item: OrderItem): string {
  return (
    item.book?.title ?? item.gift?.name ?? item.card?.title ?? "Unknown item"
  );
}

export type Order = {
  id: string;
  customerId: string;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid_online" | "pay_in_store";
  totalCents: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  items?: OrderItem[];
};

export type Event = {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  capacity: number | null;
  createdAt: string;
};

export type StorePolicy = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
};

// Mirrors MarketingDraft.as_dict() in apps/content-generator's
// riverside_marketing/generation/drafts.py, via apps/backend's
// lib/marketing/client.ts.
export type MarketingDraft = {
  book_id: string;
  content_type: string;
  headline: string;
  body_copy: string;
  reason: string;
  source_fields: string[];
};

export type ValidationDiagnostic = {
  index: number;
  book_id: string | null;
  valid: boolean;
  errors: { path: string; message: string }[];
};

export type RejectedRecord = {
  index: number;
  record: unknown;
};

export type MarketingGenerationResult = {
  generated_drafts: MarketingDraft[];
  rejected_records: RejectedRecord[];
  validation_diagnostics: ValidationDiagnostic[];
  summary: {
    total_records: number;
    valid_records: number;
    rejected_records: number;
    generated_drafts: number;
  };
};
