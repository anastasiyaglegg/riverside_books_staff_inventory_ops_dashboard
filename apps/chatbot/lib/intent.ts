import type { Intent } from "./types";
import { classifyIntentWithClaude } from "./claude";

export interface IntentClassification {
  intent: Intent;
  isbn: string | null;
  priceUnder: number | null;
  isRecommendationQuery: boolean;
}

const ISBN_RE = /\b(97[89][\d- ]{9,13}\d|\d{9}[\dXx])\b/;
const PRICE_RE = /(?:under|less than|below|cheaper than)\s*\$?(\d+(?:\.\d+)?)/i;

const HANDOFF_RE =
  /\b(talk to|speak (to|with)|call (the )?store|a human|real person|bookseller directly|staff member)\b/i;
// Phrase-based, not just "hours"/"open"/"close" as bare words — those collide
// with ordinary English inside book titles/descriptions (e.g. "Small Hours,
// Bright City"). Require actual hours-question phrasing instead.
const HOURS_RE =
  /\b(what time (do|does|are)|when (do|does) (you|the store)|store hours|opening hours|business hours|hours (today|tomorrow|on \w+day)|are you open|open(?:ing)? (today|tomorrow|on \w+day|right now)|clos(?:e|ed|ing) (today|tomorrow|on \w+day)|what are your hours)\b/i;
// Anchored to the WHOLE message, not a substring — a bare "hours?" or "open?"
// is unambiguous with nothing else in the query, unlike HOURS_RE which must
// stay phrase-based to avoid matching "hours" inside book titles/descriptions
// (e.g. "Small Hours, Bright City"). Full-message anchoring can't collide with
// those since no catalog title is literally just "hours"/"open"/"closed".
const HOURS_BARE_RE = /^(store |shop )?(hours?|open(?:ing)?|clos(?:e|ed|ing))[?.!]*$/i;
const POLICY_RE = /\b(return|refund|exchange|policy|preorder|pre-order|hold)\b/i;
const EVENTS_RE = /\b(event|events|reading|signing|workshop|book club|author visit)\b/i;
const LOYALTY_RE = /\b(loyalty|stamps?|rewards? program)\b/i;
const SAMPLE_RE =
  /\b(sample|excerpt|preview|first chapter|read (me|a bit|some|the (opening|beginning)))\b/i;
const RECOMMEND_RE = /\b(best|favorite|favourite|recommend|suggestion|top pick|good book)\b/i;
const STOCK_RE = /\b(do you have|in stock|available|carry|copies?|stock)\b/i;
const BROWSE_RE = /\b(gifts?|cards?|browse|anything (under|for))\b/i;

// Common lead-in/filler words in stock questions. Stripped before handing the
// message to searchCatalog's trigram matcher — a long sentence ("Is Small
// Hours Bright City available?") dilutes trigram similarity against a short
// title far more than the title phrase alone does.
const FILLER_RE =
  /\b(do you have|have you got|do you carry|do you sell|can i get|i want|i'?m looking for|looking for|is|are|any|available|in stock|copies?|please|book called|book titled|titled|called)\b/gi;

export function extractSearchTerms(message: string): string {
  const cleaned = message
    .replace(FILLER_RE, " ")
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : message.trim();
}

/**
 * Keyword-first classification (Section 7 of the brief). Returns "unknown"
 * when nothing matches — callers should fall back to classifyIntent (below),
 * which only calls Claude in that ambiguous case, to keep latency/cost down.
 */
export function classifyIntentByKeyword(message: string): IntentClassification {
  const isbnMatch = message.match(ISBN_RE);
  const priceMatch = message.match(PRICE_RE);
  const isRecommendationQuery = RECOMMEND_RE.test(message);

  const base: IntentClassification = {
    intent: "unknown",
    isbn: isbnMatch ? isbnMatch[0].replace(/[\s-]/g, "") : null,
    priceUnder: priceMatch ? Number(priceMatch[1]) : null,
    isRecommendationQuery,
  };

  if (HANDOFF_RE.test(message)) return { ...base, intent: "handoff" };
  if (SAMPLE_RE.test(message)) return { ...base, intent: "sample_request" };
  if (LOYALTY_RE.test(message)) return { ...base, intent: "loyalty_faq" };
  if (HOURS_RE.test(message) || HOURS_BARE_RE.test(message.trim())) return { ...base, intent: "hours" };
  if (POLICY_RE.test(message)) return { ...base, intent: "policy" };
  if (EVENTS_RE.test(message)) return { ...base, intent: "events" };
  if (isRecommendationQuery) return { ...base, intent: "product_browse" };
  if (base.priceUnder !== null || BROWSE_RE.test(message)) return { ...base, intent: "product_browse" };
  if (base.isbn || STOCK_RE.test(message)) return { ...base, intent: "stock_check" };

  // A short phrase with no question mark and no other keyword hit reads as a
  // customer just typing/pasting a title ("The Lanterns of Bellweather") —
  // treat it as a stock check directly rather than burning a Claude call on
  // something this unambiguous.
  const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 0 && wordCount <= 8 && !message.includes("?")) {
    return { ...base, intent: "stock_check" };
  }

  return base;
}

/**
 * Full classification: keyword rules first, Claude only when they're
 * ambiguous (result is "unknown"). Keeps most turns keyword-fast and cheap.
 * If Claude is also unavailable (see classifyIntentWithClaude's catch), falls
 * back to stock_check as a last resort — searchCatalog on an unmatched query
 * just returns empty, which is still a safe, correct "I don't have that"
 * outcome, so this is strictly better than doing no retrieval at all.
 */
export async function classifyIntent(message: string): Promise<IntentClassification> {
  const keywordResult = classifyIntentByKeyword(message);
  if (keywordResult.intent !== "unknown") return keywordResult;

  const claudeIntent = await classifyIntentWithClaude(message);
  if (claudeIntent !== "unknown") return { ...keywordResult, intent: claudeIntent };

  return { ...keywordResult, intent: "stock_check" };
}
