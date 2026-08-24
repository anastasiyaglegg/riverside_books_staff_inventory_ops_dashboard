// Shared types for Product C. Mirrors the columns in
// reference/riverside_books_schema_no_stripe.sql + schema/migrations/002_product_c_samples.sql.
// retrieval.ts is the only place allowed to read these tables from Supabase.

export type StockBand = "in_stock" | "low_stock" | "out_of_stock";

export function stockBand(stockLevel: number): StockBand {
  if (stockLevel >= 5) return "in_stock";
  if (stockLevel >= 1) return "low_stock";
  return "out_of_stock";
}

/** Human-readable stock line matching the Section 2 stock-band rules exactly. */
export function stockBandLabel(stockLevel: number): string {
  const band = stockBand(stockLevel);
  if (band === "in_stock") return "In stock";
  if (band === "low_stock") {
    return `Low stock — ${stockLevel} listed. Inventory changes quickly, so the shop can confirm.`;
  }
  return "Out of stock — we can request it for you.";
}

export type ProductType = "book" | "card" | "gift";

/** Unified catalog row shape returned by searchCatalog / getItemsUnderPrice. */
export interface CatalogItem {
  product_type: ProductType;
  id: number;
  name: string;
  author?: string;
  price: number;
  stock_level: number;
  description: string | null;
  isbn?: string | null;
}

export interface Book {
  id: number;
  isbn: string | null;
  title: string;
  author: string;
  category: string | null;
  price: number;
  stock_level: number;
  description: string | null;
  cover_image_url: string | null;
}

export interface StoreInfoRow {
  id: number;
  key: string;
  value: string;
  category: "hours" | "policy" | "contact" | "faq";
}

export interface EventRow {
  id: number;
  title: string;
  author: string | null;
  event_date: string;
  event_time: string | null;
  description: string | null;
  featured_book_id: number | null;
  location: string | null;
  capacity: number | null;
  registration_url: string | null;
  image_url: string | null;
}

export type SampleType = "licensed_excerpt" | "publisher_preview_url" | "staff_teaser";

export interface BookSample {
  id: number;
  book_id: number;
  sample_type: SampleType;
  excerpt_text: string | null;
  preview_url: string | null;
  word_count: number | null;
  rights_source: string;
  is_active: boolean;
}

export type SamplePreviewAction =
  | "shown"
  | "opened"
  | "completed"
  | "reserve_clicked"
  | "dismissed";

export type Intent =
  | "stock_check"
  | "product_browse"
  | "hours"
  | "policy"
  | "events"
  | "loyalty_faq"
  | "sample_request"
  | "handoff"
  | "unknown";

/** The complete set of facts available to Claude for one turn. Nothing else may be cited. */
export interface RetrievedData {
  intent: Intent;
  books: CatalogItem[];
  cards: CatalogItem[];
  gifts: CatalogItem[];
  store_info: StoreInfoRow[];
  events: EventRow[];
  has_sample: boolean;
  sample_book_id: number | null;
}

export interface ChatApiResponse {
  reply: string;
  cards: CatalogItem[];
  sample: { available: boolean; book_id: number | null } | null;
  handoff: boolean;
  session_id: string;
}

/**
 * Deep-link to Product A's reservation flow. Product C never writes to `orders` —
 * it only hands off. NEXT_PUBLIC_PRODUCT_A_URL is a placeholder until Product A ships
 * (see CLAUDE.md "Decisions made autonomously").
 */
export function buildReservationUrl(productType: ProductType, productId: number): string {
  const base = process.env.NEXT_PUBLIC_PRODUCT_A_URL || "https://product-a.riversidebooks.example/reserve";
  const url = new URL(base);
  url.searchParams.set("product_type", productType);
  url.searchParams.set("product_id", String(productId));
  url.searchParams.set("source", "chatbot_sample");
  return url.toString();
}
