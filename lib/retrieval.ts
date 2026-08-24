import { getSupabaseAdmin } from "./supabase";
import type { CatalogItem, ProductType, StoreInfoRow, EventRow, BookSample } from "./types";

// The ONLY module allowed to query books/cards/gifts/store_info/events/book_samples.
// Never queries customers, orders, or inventory_history — that boundary is what keeps
// PII out of the Claude prompt (see CLAUDE.md, non-negotiable rule 6).
// Every function returns typed rows, never prose. Parameterized queries only.

/** Strip characters that would break PostgREST's .or() filter mini-language. */
function sanitizeForOrFilter(term: string): string {
  return term.replace(/[,()]/g, " ").trim();
}

interface SearchBooksTrgmRow {
  id: number;
  isbn: string | null;
  title: string;
  author: string;
  price: number;
  stock_level: number;
  description: string | null;
  score: number;
}

/**
 * Unified catalog search across books (trigram-ranked via the search_books_trgm
 * RPC, schema/migrations/003_search_functions.sql), cards, and gifts (name/category
 * ILIKE). Ordered by relevance score desc, then stock_level desc, trimmed to `limit`.
 */
export async function searchCatalog(
  query: string,
  opts: { limit?: number } = {}
): Promise<CatalogItem[]> {
  const limit = opts.limit ?? 5;
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = getSupabaseAdmin();
  const orFilter = `name.ilike.%${sanitizeForOrFilter(trimmed)}%,category.ilike.%${sanitizeForOrFilter(trimmed)}%`;

  const [booksRes, cardsRes, giftsRes] = await Promise.all([
    supabase.rpc("search_books_trgm", { search_query: trimmed, match_limit: limit }),
    supabase
      .from("cards")
      .select("id, name, price, stock_level, description")
      .or(orFilter)
      .order("stock_level", { ascending: false })
      .limit(limit),
    supabase
      .from("gifts")
      .select("id, name, price, stock_level, description")
      .or(orFilter)
      .order("stock_level", { ascending: false })
      .limit(limit),
  ]);

  if (booksRes.error) throw booksRes.error;
  if (cardsRes.error) throw cardsRes.error;
  if (giftsRes.error) throw giftsRes.error;

  const scored: Array<CatalogItem & { _score: number }> = [];

  for (const b of (booksRes.data as SearchBooksTrgmRow[] | null) ?? []) {
    scored.push({
      product_type: "book",
      id: b.id,
      name: b.title,
      author: b.author,
      isbn: b.isbn,
      price: Number(b.price),
      stock_level: b.stock_level,
      description: b.description,
      _score: b.score ?? 0,
    });
  }
  for (const c of cardsRes.data ?? []) {
    scored.push({
      product_type: "card",
      id: c.id,
      name: c.name,
      price: Number(c.price),
      stock_level: c.stock_level,
      description: c.description,
      _score: 0.5, // ILIKE name/category match, no trigram score available
    });
  }
  for (const g of giftsRes.data ?? []) {
    scored.push({
      product_type: "gift",
      id: g.id,
      name: g.name,
      price: Number(g.price),
      stock_level: g.stock_level,
      description: g.description,
      _score: 0.5,
    });
  }

  scored.sort((a, b) => b._score - a._score || b.stock_level - a.stock_level);
  return scored.slice(0, limit).map(({ _score, ...item }) => item);
}

export async function lookupByIsbn(isbn: string): Promise<CatalogItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("id, isbn, title, author, price, stock_level, description")
    .eq("isbn", isbn.trim())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    product_type: "book",
    id: data.id,
    name: data.title,
    author: data.author,
    isbn: data.isbn,
    price: Number(data.price),
    stock_level: data.stock_level,
    description: data.description,
  };
}

/** Used to resolve an event's featured_book_id into a displayable catalog item. */
export async function getBookById(id: number): Promise<CatalogItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("id, isbn, title, author, price, stock_level, description")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    product_type: "book",
    id: data.id,
    name: data.title,
    author: data.author,
    isbn: data.isbn,
    price: Number(data.price),
    stock_level: data.stock_level,
    description: data.description,
  };
}

export async function getStoreInfo(
  categories: StoreInfoRow["category"][]
): Promise<StoreInfoRow[]> {
  if (categories.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("store_info")
    .select("id, key, value, category")
    .in("category", categories);
  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingEvents(limit = 3): Promise<EventRow[]> {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, author, event_date, event_time, description, featured_book_id, location, capacity, registration_url, image_url"
    )
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Active sample row for a book, or null if none exists / is active. */
export async function getSample(bookId: number): Promise<BookSample | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("book_samples")
    .select(
      "id, book_id, sample_type, excerpt_text, preview_url, word_count, rights_source, is_active"
    )
    .eq("book_id", bookId)
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/**
 * Neutral browse fallback for vague requests like "what's your best book?".
 * Ordered by stock_level desc (availability) — NOT a quality ranking. Framed
 * via each book's own description field so Claude never has to invent a
 * superlative claim (rule 5: no "bestseller"/"award-winning" unless that
 * exact wording is in the description).
 */
export async function getFeaturedBooks(limit = 3): Promise<CatalogItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("books")
    .select("id, isbn, title, author, price, stock_level, description")
    .order("stock_level", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((b) => ({
    product_type: "book" as const,
    id: b.id,
    name: b.title,
    author: b.author,
    isbn: b.isbn,
    price: Number(b.price),
    stock_level: b.stock_level,
    description: b.description,
  }));
}

export async function getItemsUnderPrice(
  amount: number,
  types: ProductType[] = ["gift", "card"]
): Promise<CatalogItem[]> {
  const supabase = getSupabaseAdmin();
  const results: CatalogItem[] = [];

  if (types.includes("card")) {
    const { data, error } = await supabase
      .from("cards")
      .select("id, name, price, stock_level, description")
      .lt("price", amount)
      .order("stock_level", { ascending: false });
    if (error) throw error;
    for (const c of data ?? []) {
      results.push({
        product_type: "card",
        id: c.id,
        name: c.name,
        price: Number(c.price),
        stock_level: c.stock_level,
        description: c.description,
      });
    }
  }

  if (types.includes("gift")) {
    const { data, error } = await supabase
      .from("gifts")
      .select("id, name, price, stock_level, description")
      .lt("price", amount)
      .order("stock_level", { ascending: false });
    if (error) throw error;
    for (const g of data ?? []) {
      results.push({
        product_type: "gift",
        id: g.id,
        name: g.name,
        price: Number(g.price),
        stock_level: g.stock_level,
        description: g.description,
      });
    }
  }

  if (types.includes("book")) {
    const { data, error } = await supabase
      .from("books")
      .select("id, isbn, title, author, price, stock_level, description")
      .lt("price", amount)
      .order("stock_level", { ascending: false });
    if (error) throw error;
    for (const b of data ?? []) {
      results.push({
        product_type: "book",
        id: b.id,
        name: b.title,
        author: b.author,
        isbn: b.isbn,
        price: Number(b.price),
        stock_level: b.stock_level,
        description: b.description,
      });
    }
  }

  return results;
}
