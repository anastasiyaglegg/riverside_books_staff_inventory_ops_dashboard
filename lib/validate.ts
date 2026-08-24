import type { RetrievedData } from "./types";

/** All prices formatted as "$X.XX" from the retrieved catalog items. */
function knownPriceStrings(retrieved: RetrievedData): Set<string> {
  const set = new Set<string>();
  for (const item of [...retrieved.books, ...retrieved.cards, ...retrieved.gifts]) {
    set.add(`$${item.price.toFixed(2)}`);
  }
  return set;
}

function knownStockNumbers(retrieved: RetrievedData): Set<number> {
  const set = new Set<number>();
  for (const item of [...retrieved.books, ...retrieved.cards, ...retrieved.gifts]) {
    set.add(item.stock_level);
  }
  return set;
}

/**
 * True if the reply states a dollar price, or a stock count phrased as
 * "N copies/listed/left/in stock", that doesn't match anything retrieved
 * this turn. Deliberately narrow (price/stock patterns only, not every
 * number) to avoid false positives on event capacities, dates, phone numbers.
 */
export function hasUnsourcedPriceOrStock(reply: string, retrieved: RetrievedData): boolean {
  const knownPrices = knownPriceStrings(retrieved);
  const priceMatches = reply.match(/\$\d+(?:\.\d{1,2})?/g) ?? [];
  for (const raw of priceMatches) {
    const normalized = `$${Number(raw.replace("$", "")).toFixed(2)}`;
    if (!knownPrices.has(normalized)) return true;
  }

  const knownStock = knownStockNumbers(retrieved);
  const stockMatches = [
    ...reply.matchAll(/\b(\d+)\s*(?:copies|copy|listed|left|in stock)\b/gi),
  ];
  for (const m of stockMatches) {
    if (!knownStock.has(Number(m[1]))) return true;
  }

  return false;
}

/**
 * Removes any quoted passage over 15 words that isn't a substring of a
 * retrieved description/store_info/event field. Safety net behind the system
 * prompt's "never write excerpts" rule — should rarely trigger.
 */
export function stripUnsourcedLongQuotes(reply: string, retrieved: RetrievedData): string {
  const sourceTexts = [
    ...retrieved.books.map((b) => b.description ?? ""),
    ...retrieved.cards.map((c) => c.description ?? ""),
    ...retrieved.gifts.map((g) => g.description ?? ""),
    ...retrieved.store_info.map((s) => s.value),
    ...retrieved.events.map((e) => e.description ?? ""),
  ];

  return reply.replace(/["“]([^"”]{1,4000})["”]/g, (full, quoted: string) => {
    const wordCount = quoted.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 15) return full;
    const traceable = sourceTexts.some((src) => src.includes(quoted));
    return traceable ? full : "";
  });
}

export function fallbackReply(storePhone: string | null): string {
  const phone = storePhone ?? "the store";
  return `I can't confirm that right now — the shop can help at ${phone}.`;
}

/**
 * Orchestrates the full post-response check: retry once via `regenerate` if
 * the reply cites an unsourced price/stock number, fall back to a
 * deterministic message on a second failure, then always strip any
 * unsourced long quote from whatever reply survives.
 */
export async function validateAndFinalize(
  initialReply: string,
  retrieved: RetrievedData,
  regenerate: () => Promise<string>,
  storePhone: string | null
): Promise<string> {
  let reply = initialReply;

  if (hasUnsourcedPriceOrStock(reply, retrieved)) {
    reply = await regenerate();
    if (hasUnsourcedPriceOrStock(reply, retrieved)) {
      return fallbackReply(storePhone);
    }
  }

  return stripUnsourcedLongQuotes(reply, retrieved);
}
