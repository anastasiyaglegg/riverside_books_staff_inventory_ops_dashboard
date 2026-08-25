// Trimmed copy of the client-relevant types from Shalinthia's
// apps/chatbot/lib/types.ts (that file also has server-only retrieval types
// this widget never touches). Kept in sync by hand since her repo is a
// read-only vendored reference (apps/chatbot), not something this app imports
// directly across the Vite/Next boundary.

export type StockBand = "in_stock" | "low_stock" | "out_of_stock";

export function stockBand(stockLevel: number): StockBand {
  if (stockLevel >= 5) return "in_stock";
  if (stockLevel >= 1) return "low_stock";
  return "out_of_stock";
}

export type ProductType = "book" | "card" | "gift";

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

export interface StoreInfoRow {
  id: number;
  key: string;
  value: string;
  category: "hours" | "policy" | "contact" | "faq";
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

export interface ChatApiResponse {
  reply: string;
  cards: CatalogItem[];
  sample: { available: boolean; book_id: number | null } | null;
  handoff: boolean;
  session_id: string;
}
