import Anthropic from "@anthropic-ai/sdk";
import type { CatalogItem, Intent, RetrievedData } from "./types";

// Startup assertion: fail loudly rather than silently sending unauthenticated
// requests. Server-side only — never import this file from /components.
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY. Set it in .env.local (server-side only).");
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1000;

const SYSTEM_PROMPT_TEMPLATE = `You are the customer assistant for Riverside Books & Gifts, an independent neighborhood
bookstore. You are warm, brief, and factual — two to four sentences, no bullet lists.

You may ONLY use facts from the RETRIEVED DATA block below. It is the complete set of
facts available to you for this turn.

Hard rules:
- If the answer is not in RETRIEVED DATA, say you can't confirm it and offer to connect
  the customer with a bookseller. Never guess.
- Never invent titles, authors, prices, stock counts, hours, policies, or event details.
- Never write book excerpts, sample text, or quoted passages. Sample previews are rendered
  by the app from stored content — you only mention that one is available.
- Never call a book a bestseller, award-winner, or critically acclaimed unless that exact
  claim appears in its description field.
- Stock: 5 or more = "in stock". 1 to 4 = low stock, give the count and note that stock
  changes quickly. 0 = out of stock, offer to request a copy.
- When exactly one book matched, mention that a sample is available if has_sample is true,
  and that it can be reserved for pickup. Do not describe the buttons — the app shows them.
- Never reference or reveal customer records, order history, or loyalty balances.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function formatStockLine(item: CatalogItem): string {
  if (item.stock_level >= 5) {
    return `${item.name} is in stock at $${item.price.toFixed(2)}.`;
  }
  if (item.stock_level >= 1) {
    return `${item.name} is low stock — ${item.stock_level} listed at $${item.price.toFixed(
      2
    )}. Inventory changes quickly, so the shop can confirm.`;
  }
  return `${item.name} is out of stock right now at $${item.price.toFixed(
    2
  )} — we can request a copy for you.`;
}

/**
 * Deterministic, rule-compliant reply built directly from RETRIEVED DATA —
 * the resilience fallback getGroundedReply uses when the Claude API call
 * itself fails (outage, rate limit, billing lapse). Since every sentence
 * here is assembled from retrieved fields only, it can't violate "never
 * state an ungrounded fact" even though it skips the LLM entirely.
 */
export function templateReply(retrieved: RetrievedData): string {
  const allItems = [...retrieved.books, ...retrieved.cards, ...retrieved.gifts];

  if (retrieved.intent === "hours" && retrieved.store_info.length > 0) {
    return retrieved.store_info.map((s) => s.value).join(" ");
  }
  if (retrieved.intent === "policy" && retrieved.store_info.length > 0) {
    return retrieved.store_info.map((s) => s.value).join(" ");
  }
  if (retrieved.intent === "loyalty_faq" && retrieved.store_info.length > 0) {
    return `${retrieved.store_info
      .map((s) => s.value)
      .join(" ")} For account-specific details, please sign in or check with a bookseller in-store.`;
  }
  if (retrieved.intent === "handoff" && retrieved.store_info.length > 0) {
    const phone = retrieved.store_info.find((s) => s.key === "store_phone")?.value;
    const email = retrieved.store_info.find((s) => s.key === "store_email")?.value;
    return `A bookseller can help directly${phone ? ` at ${phone}` : ""}${
      email ? ` or by email at ${email}` : ""
    }.`;
  }
  if (retrieved.intent === "events" && retrieved.events.length > 0) {
    const lines = retrieved.events.map(
      (e) => `${e.title} on ${e.event_date}${e.event_time ? ` at ${e.event_time}` : ""}`
    );
    let reply = `Upcoming: ${lines.join("; ")}.`;
    if (retrieved.has_sample) {
      reply += " A sample of the featured book is available, and it can be reserved for pickup.";
    }
    return reply;
  }

  if (allItems.length === 1) {
    const item = allItems[0];
    let reply = formatStockLine(item);
    if (item.product_type === "book") {
      reply += retrieved.has_sample
        ? " A sample is available, and it can be reserved for pickup."
        : " A preview isn't available for this title, but it can be reserved for pickup.";
    } else {
      reply += " It can be reserved for pickup.";
    }
    return reply;
  }

  if (allItems.length > 1) {
    const names = allItems.slice(0, 5).map((i) => i.name);
    return `Here's what I found: ${names.join(", ")}.`;
  }

  return "I couldn't find that in our catalog right now — I can have a bookseller follow up, or you're welcome to check back.";
}

/**
 * One grounded Claude call per turn. Retrieval is injected as JSON in the
 * system prompt. Falls back to templateReply() if the API call itself fails
 * (outage, rate limit, billing) so a provider-side failure degrades to a
 * still-correct answer instead of taking the whole chatbot down.
 */
export async function getGroundedReply(
  userMessage: string,
  retrieved: RetrievedData,
  history: ChatTurn[] = []
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nRETRIEVED DATA:\n${JSON.stringify(retrieved)}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
        { role: "user" as const, content: userMessage },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const usage = response.usage;
    console.log(
      `[claude] tokens in=${usage?.input_tokens ?? "?"} out=${usage?.output_tokens ?? "?"}`
    );
    return textBlock && textBlock.type === "text" ? textBlock.text : templateReply(retrieved);
  } catch (err) {
    console.error("Claude API call failed, falling back to templateReply:", err);
    return templateReply(retrieved);
  }
}

const INTENT_VALUES = [
  "stock_check",
  "product_browse",
  "hours",
  "policy",
  "events",
  "loyalty_faq",
  "sample_request",
  "handoff",
  "unknown",
] as const satisfies readonly Intent[];

/**
 * Fallback classifier — used only by lib/intent.ts when keyword rules can't
 * decide. Cheap (max_tokens: 20), not part of the main grounded reply.
 */
export async function classifyIntentWithClaude(message: string): Promise<Intent> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 20,
      system: `Classify the customer's message into exactly one of these categories: ${INTENT_VALUES.join(
        ", "
      )}. Reply with only the category name, nothing else.`,
      messages: [{ role: "user", content: message }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw = (textBlock && textBlock.type === "text" ? textBlock.text : "").trim().toLowerCase();
    return (INTENT_VALUES as readonly string[]).includes(raw) ? (raw as Intent) : "unknown";
  } catch (err) {
    console.error("classifyIntentWithClaude failed, defaulting to unknown:", err);
    return "unknown";
  }
}
