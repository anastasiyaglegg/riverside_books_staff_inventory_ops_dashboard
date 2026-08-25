import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { classifyIntent, extractSearchTerms } from "@/lib/intent";
import {
  searchCatalog,
  lookupByIsbn,
  getStoreInfo,
  getUpcomingEvents,
  getSample,
  getItemsUnderPrice,
  getFeaturedBooks,
  getBookById,
} from "@/lib/retrieval";
import { getGroundedReply, type ChatTurn } from "@/lib/claude";
import { validateAndFinalize } from "@/lib/validate";
import { checkSessionRateLimit, checkIpRateLimit, recordIpRequest } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import { corsHeaders, corsPreflight } from "@/lib/cors";
import type {
  CatalogItem,
  ChatApiResponse,
  EventRow,
  Intent,
  RetrievedData,
  StoreInfoRow,
} from "@/lib/types";

interface ChatRequestBody {
  message?: string;
  session_id?: string;
  history?: ChatTurn[];
  customer_email?: string | null;
}

export async function OPTIONS(request: Request): Promise<NextResponse> {
  return corsPreflight(request);
}

function splitByType(items: CatalogItem[]) {
  return {
    books: items.filter((i) => i.product_type === "book"),
    cards: items.filter((i) => i.product_type === "card"),
    gifts: items.filter((i) => i.product_type === "gift"),
  };
}

function detectBrowseTypes(message: string): ("card" | "gift")[] {
  const wantsGift = /\bgifts?\b/i.test(message);
  const wantsCard = /\bcards?\b/i.test(message);
  if (wantsGift && !wantsCard) return ["gift"];
  if (wantsCard && !wantsGift) return ["card"];
  return ["gift", "card"];
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

interface IntentClassificationLite {
  isbn: string | null;
  priceUnder: number | null;
  isRecommendationQuery: boolean;
}

/** Retrieves exactly the data the classified intent needs — Section 4/7 of the brief. */
async function buildRetrievedData(
  intent: Intent,
  message: string,
  classification: IntentClassificationLite
): Promise<RetrievedData> {
  let books: CatalogItem[] = [];
  let cards: CatalogItem[] = [];
  let gifts: CatalogItem[] = [];
  let storeInfo: StoreInfoRow[] = [];
  let events: EventRow[] = [];

  switch (intent) {
    case "stock_check": {
      if (classification.isbn) {
        const match = await lookupByIsbn(classification.isbn);
        if (match) books = [match];
      } else {
        const results = await searchCatalog(extractSearchTerms(message), { limit: 5 });
        ({ books, cards, gifts } = splitByType(results));
      }
      break;
    }
    case "sample_request": {
      const results = await searchCatalog(extractSearchTerms(message), { limit: 5 });
      ({ books, cards, gifts } = splitByType(results));
      break;
    }
    case "product_browse": {
      if (classification.priceUnder !== null) {
        const types = detectBrowseTypes(message);
        const results = await getItemsUnderPrice(classification.priceUnder, types);
        ({ books, cards, gifts } = splitByType(results));
      } else {
        const results = await searchCatalog(extractSearchTerms(message), { limit: 5 });
        ({ books, cards, gifts } = splitByType(results));
        if (
          books.length === 0 &&
          cards.length === 0 &&
          gifts.length === 0 &&
          classification.isRecommendationQuery
        ) {
          books = await getFeaturedBooks(3);
        }
      }
      break;
    }
    case "hours":
      storeInfo = await getStoreInfo(["hours"]);
      break;
    case "policy":
      storeInfo = await getStoreInfo(["policy"]);
      break;
    case "loyalty_faq":
      storeInfo = await getStoreInfo(["faq"]);
      break;
    case "handoff":
      storeInfo = await getStoreInfo(["contact"]);
      break;
    case "events": {
      events = await getUpcomingEvents(3);
      const featuredBookId = events[0]?.featured_book_id ?? null;
      if (featuredBookId) {
        const featured = await getBookById(featuredBookId);
        if (featured) books = [featured];
      }
      break;
    }
    case "unknown":
    default:
      break;
  }

  // Single confident book match => sample-preview flow, regardless of the
  // intent that produced it (Section 6: fires on any turn, not a menu item).
  let hasSample = false;
  let sampleBookId: number | null = null;
  if (books.length === 1) {
    sampleBookId = books[0].id;
    const sample = await getSample(sampleBookId);
    hasSample = Boolean(sample);
  }

  return {
    intent,
    books,
    cards,
    gifts,
    store_info: storeInfo,
    events,
    has_sample: hasSample,
    sample_book_id: sampleBookId,
  };
}

function retrievedRowCount(data: RetrievedData): number {
  return (
    data.books.length +
    data.cards.length +
    data.gifts.length +
    data.store_info.length +
    data.events.length
  );
}

/**
 * Fired server-side (not from the browser) so it's guaranteed on every
 * single-book turn regardless of whether the client's JS runs — this is what
 * acceptance test 11 checks for. Client-side events (opened/completed/
 * reserve_clicked/dismissed) still come from ProductCard/SamplePanel, since
 * only the browser knows about those interactions.
 */
async function recordSampleShown(sessionId: string, bookId: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sample_preview_events")
    .insert({ session_id: sessionId, book_id: bookId, action: "shown" });
  if (error) {
    console.error("Failed to write sample_preview_events 'shown' row:", error);
  }
}

async function logChatTurn(params: {
  sessionId: string;
  question: string;
  answer: string;
  retrieved: RetrievedData;
  wasAnswered: boolean;
  handoffOffered: boolean;
  customerEmail: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const productsReferenced = {
    books: params.retrieved.books.map((b) => b.id),
    cards: params.retrieved.cards.map((c) => c.id),
    gifts: params.retrieved.gifts.map((g) => g.id),
  };
  const { error } = await supabase.from("chat_logs").insert({
    session_id: params.sessionId,
    customer_email: params.customerEmail,
    question: params.question,
    answer: params.answer,
    products_referenced: productsReferenced,
    intent: params.retrieved.intent,
    was_answered: params.wasAnswered,
    handoff_offered: params.handoffOffered,
  });
  if (error) {
    console.error("Failed to write chat_logs row:", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const cors = corsHeaders(request.headers.get("origin"));

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: cors });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400, headers: cors });
  }
  const sessionId = body.session_id?.trim() || randomUUID();
  const history = Array.isArray(body.history) ? body.history : [];
  const customerEmail = body.customer_email ?? null;

  const ip = getClientIp(request);
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json({ error: "Daily rate limit exceeded" }, { status: 429, headers: cors });
  }
  const sessionOk = await checkSessionRateLimit(sessionId);
  if (!sessionOk) {
    return NextResponse.json({ error: "Rate limit exceeded, slow down" }, { status: 429, headers: cors });
  }
  recordIpRequest(ip);

  const classification = await classifyIntent(message);
  const retrieved = await buildRetrievedData(classification.intent, message, classification);

  const initialReply = await getGroundedReply(message, retrieved, history);

  let storePhone: string | null = null;
  const contactInfo = await getStoreInfo(["contact"]);
  storePhone = contactInfo.find((row) => row.key === "store_phone")?.value ?? null;

  const finalReply = await validateAndFinalize(
    initialReply,
    retrieved,
    () => getGroundedReply(message, retrieved, history),
    storePhone
  );

  const rowCount = retrievedRowCount(retrieved);
  const wasAnswered = classification.intent !== "unknown" && rowCount > 0;
  const handoffOffered =
    classification.intent === "handoff" || classification.intent === "unknown" || rowCount === 0;

  if (retrieved.sample_book_id !== null) {
    await recordSampleShown(sessionId, retrieved.sample_book_id);
  }

  await logChatTurn({
    sessionId,
    question: message,
    answer: finalReply,
    retrieved,
    wasAnswered,
    handoffOffered,
    customerEmail,
  });

  const responseCards: CatalogItem[] = [...retrieved.books, ...retrieved.cards, ...retrieved.gifts];

  const response: ChatApiResponse = {
    reply: finalReply,
    cards: responseCards,
    sample:
      retrieved.sample_book_id !== null
        ? { available: retrieved.has_sample, book_id: retrieved.sample_book_id }
        : null,
    handoff: handoffOffered,
    session_id: sessionId,
  };

  return NextResponse.json(response, { headers: cors });
}
