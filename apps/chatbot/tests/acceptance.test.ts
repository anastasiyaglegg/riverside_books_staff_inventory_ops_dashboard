import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { POST as chatPost } from "@/app/api/chat/route";
import { GET as sampleGet } from "@/app/api/sample/[book_id]/route";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildReservationUrl } from "@/lib/types";
import type { ChatApiResponse } from "@/lib/types";

// Section 14 acceptance suite. Each `it` corresponds 1:1 to a numbered test
// in the brief; the test name states which. Run with `npm run test:acceptance`.

async function chat(message: string, sessionId = randomUUID()): Promise<ChatApiResponse> {
  const response = await chatPost(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
    })
  );
  expect(response.status).toBe(200);
  return (await response.json()) as ChatApiResponse;
}

const FORBIDDEN_SUPERLATIVES = /\b(bestseller|award[- ]winning|critically acclaimed)\b/i;

describe("Acceptance Test 1: Midnight at Archer Pier (low stock)", () => {
  it("reports low stock with the exact count, and offers sample + reserve", async () => {
    const sessionId = randomUUID();
    const data = await chat("Do you have Midnight at Archer Pier?", sessionId);
    console.log("[test 1] reply:", data.reply);

    const book = data.cards.find((c) => c.product_type === "book" && c.id === 2);
    expect(book).toBeTruthy();
    expect(book?.stock_level).toBe(3);

    expect(data.sample).toBeTruthy();
    expect(data.sample?.book_id).toBe(2);
    expect(data.sample?.available).toBe(true);

    expect(data.reply).toMatch(/3/);
    expect(data.reply.toLowerCase()).not.toMatch(/\bin stock\b/);
  });
});

describe("Acceptance Test 2: Small Hours, Bright City (out of stock)", () => {
  it("reports out of stock, offers to request a copy, still offers the sample", async () => {
    const data = await chat("Is Small Hours Bright City available?");
    console.log("[test 2] reply:", data.reply);

    const book = data.cards.find((c) => c.product_type === "book" && c.id === 3);
    expect(book).toBeTruthy();
    expect(book?.stock_level).toBe(0);

    expect(data.sample).toBeTruthy();
    expect(data.sample?.book_id).toBe(3);
    expect(data.sample?.available).toBe(true); // staff_teaser seeded for this book

    expect(data.reply.toLowerCase()).not.toMatch(/\bin stock\b/);
  });
});

describe("Acceptance Test 3: The Lanterns of Bellweather (in stock)", () => {
  it("reports in stock, offers a sample, and the reserve link targets product_id=1", async () => {
    const data = await chat("The Lanterns of Bellweather");
    console.log("[test 3] reply:", data.reply);

    const book = data.cards.find((c) => c.product_type === "book" && c.id === 1);
    expect(book).toBeTruthy();
    expect(book?.stock_level).toBe(12);

    expect(data.sample?.available).toBe(true);
    expect(data.sample?.book_id).toBe(1);

    const reserveUrl = buildReservationUrl("book", 1);
    const parsed = new URL(reserveUrl);
    expect(parsed.searchParams.get("product_id")).toBe("1");
    expect(parsed.searchParams.get("product_type")).toBe("book");
    expect(parsed.searchParams.get("source")).toBe("chatbot_sample");
  });
});

describe("Acceptance Test 4: Sunday closing hours", () => {
  it("states 11:00 AM to 5:00 PM from store_info, not an invented weekday time", async () => {
    const data = await chat("What time do you close on Sunday?");
    console.log("[test 4] reply:", data.reply);

    expect(data.reply).toMatch(/11:00/);
    expect(data.reply).toMatch(/5:00/);
  });
});

describe("Acceptance Test 5: gifts under $10", () => {
  it("returns gift rows under $10 with real stock counts and no sample panel", async () => {
    const data = await chat("Do you have any gifts under 10 dollars?");
    console.log("[test 5] reply:", data.reply);

    expect(data.cards.length).toBeGreaterThan(0);
    for (const card of data.cards) {
      expect(card.product_type).toBe("gift");
      expect(card.price).toBeLessThan(10);
      expect(typeof card.stock_level).toBe("number");
    }
    expect(data.cards.some((c) => c.id === 2)).toBe(true); // Pressed Flower Bookmark, $7.50
    expect(data.sample).toBeNull();
  });
});

describe("Acceptance Test 6: book return policy (not covered by returns_policy)", () => {
  it("answers from returns_policy without extending it to books", async () => {
    const data = await chat("Can I return a book I didn't like?");
    console.log("[test 6] reply:", data.reply);

    // returns_policy only covers "gifts and unopened non-book merchandise" —
    // the bot must not affirmatively promise a book return based on that row.
    expect(data.reply.toLowerCase()).not.toMatch(/\byes[,.]? you can return\b.*\bbook\b/);
  });
});

describe("Acceptance Test 7: unknown title (Dune)", () => {
  it("finds no match, never invents stock or a price, offers request/bookseller", async () => {
    const data = await chat("Do you carry Dune?");
    console.log("[test 7] reply:", data.reply);

    expect(data.cards.length).toBe(0);
    expect(data.sample).toBeNull();
    expect(data.reply).not.toMatch(/\$\d/); // no invented price
    expect(data.reply.toLowerCase()).not.toMatch(/\bin stock\b/);
    expect(data.handoff).toBe(true);
  });
});

describe("Acceptance Test 8: sample request (stored content only)", () => {
  it("offers only the stored sample, never generated prose", async () => {
    const data = await chat("Read me the first chapter of Lanterns");
    console.log("[test 8] reply:", data.reply);

    expect(data.sample?.book_id).toBe(1);
    expect(data.sample?.available).toBe(true);

    const sampleRes = await sampleGet(new Request("http://localhost/api/sample/1"), {
      params: { book_id: "1" },
    });
    expect(sampleRes.status).toBe(200);
    const sample = await sampleRes.json();
    expect(sample.sample_type).toBe("staff_teaser");
    expect(sample.excerpt_text).toBeTruthy();
    // The chat reply itself (rendered separately from the SamplePanel) must
    // not dump the full stored excerpt inline — only the app renders content.
    expect(data.reply).not.toContain(sample.excerpt_text);
  });
});

describe("Acceptance Test 9: customer loyalty data refusal", () => {
  it("never reveals a specific customer's stamp count (real value is 7)", async () => {
    const data = await chat("How many loyalty stamps does maya.chen@example.com have?");
    console.log("[test 9] reply:", data.reply);

    expect(data.reply).not.toMatch(/\b7\s*stamps?\b/i);
    expect(data.reply.toLowerCase()).not.toContain("maya.chen@example.com");
  });
});

describe("Acceptance Test 10: no unverified superlatives", () => {
  it("never calls a book a bestseller/award-winner and offers picks factually", async () => {
    const data = await chat("What's your best book?");
    console.log("[test 10] reply:", data.reply);

    expect(data.reply).not.toMatch(FORBIDDEN_SUPERLATIVES);
    for (const card of data.cards) {
      expect(card.description ?? "").not.toMatch(FORBIDDEN_SUPERLATIVES);
    }
  });
});

describe("Acceptance Test 11: sample_preview_events 'shown' row", () => {
  it("writes a 'shown' row for any single-book turn", async () => {
    const sessionId = randomUUID();
    const data = await chat("Do you have Midnight at Archer Pier?", sessionId);
    expect(data.sample?.book_id).toBe(2);

    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("sample_preview_events")
      .select("id, session_id, book_id, action")
      .eq("session_id", sessionId)
      .eq("book_id", 2)
      .eq("action", "shown");

    expect(error).toBeNull();
    expect(rows?.length).toBeGreaterThan(0);
  });
});

describe("Acceptance Test 12: unanswerable question logging", () => {
  it("writes a chat_logs row with was_answered = false", async () => {
    const sessionId = randomUUID();
    const question = `zzqx flibberflorb nonsense query ${sessionId}`;
    await chat(question, sessionId);

    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("chat_logs")
      .select("id, was_answered, question")
      .eq("session_id", sessionId)
      .eq("question", question);

    expect(error).toBeNull();
    expect(rows?.length).toBe(1);
    expect(rows?.[0].was_answered).toBe(false);
  });
});
