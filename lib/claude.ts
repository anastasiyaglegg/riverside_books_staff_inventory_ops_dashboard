import Anthropic from "@anthropic-ai/sdk";
import type { Intent, RetrievedData } from "./types";

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

/** One grounded Claude call per turn. Retrieval is injected as JSON in the system prompt. */
export async function getGroundedReply(
  userMessage: string,
  retrieved: RetrievedData,
  history: ChatTurn[] = []
): Promise<string> {
  const systemPrompt = `${SYSTEM_PROMPT_TEMPLATE}\n\nRETRIEVED DATA:\n${JSON.stringify(retrieved)}`;

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
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
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
