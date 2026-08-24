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
const HOURS_RE = /\b(hours?|open|opening|close|closing|closed)\b/i;
const POLICY_RE = /\b(return|refund|exchange|policy|preorder|pre-order|hold)\b/i;
const EVENTS_RE = /\b(event|events|reading|signing|workshop|book club|author visit)\b/i;
const LOYALTY_RE = /\b(loyalty|stamps?|rewards? program)\b/i;
const SAMPLE_RE =
  /\b(sample|excerpt|preview|first chapter|read (me|a bit|some|the (opening|beginning)))\b/i;
const RECOMMEND_RE = /\b(best|favorite|favourite|recommend|suggestion|top pick|good book)\b/i;
const STOCK_RE = /\b(do you have|in stock|available|carry|copies?|stock)\b/i;
const BROWSE_RE = /\b(gifts?|cards?|browse|anything (under|for))\b/i;

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
  if (HOURS_RE.test(message)) return { ...base, intent: "hours" };
  if (POLICY_RE.test(message)) return { ...base, intent: "policy" };
  if (EVENTS_RE.test(message)) return { ...base, intent: "events" };
  if (isRecommendationQuery) return { ...base, intent: "product_browse" };
  if (base.priceUnder !== null || BROWSE_RE.test(message)) return { ...base, intent: "product_browse" };
  if (base.isbn || STOCK_RE.test(message)) return { ...base, intent: "stock_check" };

  return base;
}

/**
 * Full classification: keyword rules first, Claude only when they're
 * ambiguous (result is "unknown"). Keeps most turns keyword-fast and cheap.
 */
export async function classifyIntent(message: string): Promise<IntentClassification> {
  const keywordResult = classifyIntentByKeyword(message);
  if (keywordResult.intent !== "unknown") return keywordResult;

  const claudeIntent = await classifyIntentWithClaude(message);
  return { ...keywordResult, intent: claudeIntent };
}
