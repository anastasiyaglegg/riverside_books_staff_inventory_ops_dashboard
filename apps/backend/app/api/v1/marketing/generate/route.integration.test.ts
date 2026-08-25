import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireStaffSession: vi.fn() }));
const generateMarketingContent = vi.fn();
vi.mock("@/lib/marketing/client", () => ({
  generateMarketingContent: (...args: unknown[]) => generateMarketingContent(...args),
  ContentGeneratorError: class ContentGeneratorError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { requireStaffSession } from "@/lib/auth";
import { ContentGeneratorError } from "@/lib/marketing/client";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { resetDb } from "@/test/db-helpers";

beforeEach(async () => {
  await resetDb();
  await prisma.staffUser.create({ data: { id: "staff-1", name: "Staff One", role: "owner" } });
  vi.mocked(requireStaffSession).mockResolvedValue({
    authorized: true,
    user: { id: "staff-1", name: "Staff One", role: "owner" },
  });
  generateMarketingContent.mockReset();
});

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/v1/marketing/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/v1/marketing/generate", () => {
  it("requires a staff session", async () => {
    vi.mocked(requireStaffSession).mockResolvedValue({ authorized: false });

    const response = await post({ bookIds: ["11111111-1111-1111-1111-111111111111"] });

    expect(response.status).toBe(401);
    expect(generateMarketingContent).not.toHaveBeenCalled();
  });

  it("rejects an empty bookIds array", async () => {
    const response = await post({ bookIds: [] });
    expect(response.status).toBe(400);
  });

  it("maps the requested books and forwards them to the content generator", async () => {
    const book = await prisma.book.create({
      data: {
        title: "Small Hours in Orbit",
        author: "Jon Bell",
        priceCents: 1650,
        category: "Science Fiction",
        description: "A character-driven space adventure.",
        rating: 4.4,
        inventory: { create: { quantityOnHand: 5, reorderThreshold: 2, status: "in_stock" } },
      },
    });
    generateMarketingContent.mockResolvedValue({
      generated_drafts: [
        {
          book_id: book.id,
          content_type: "promotional_description",
          headline: "A must-read",
          body_copy: "Discover Small Hours in Orbit by Jon Bell.",
          reason: "Deterministic template",
          source_fields: ["title", "author"],
        },
      ],
      rejected_records: [],
      validation_diagnostics: [],
      summary: { total_records: 1, valid_records: 1, rejected_records: 0, generated_drafts: 1 },
    });

    const response = await post({ bookIds: [book.id] });
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.data.summary.generated_drafts).toBe(1);
    const [catalog] = generateMarketingContent.mock.calls[0]!;
    expect(catalog).toEqual([
      {
        book_id: book.id,
        title: "Small Hours in Orbit",
        author: "Jon Bell",
        genre: "Science Fiction",
        price: 16.5,
        stock_status: "in_stock",
        description: "A character-driven space adventure.",
        rating: 4.4,
        promotional_tag: null,
      },
    ]);
  });

  it("persists a generated draft as the book's marketing content", async () => {
    const book = await prisma.book.create({
      data: { title: "First Light", author: "Anya Voss", priceCents: 1500 },
    });
    generateMarketingContent.mockResolvedValue({
      generated_drafts: [
        {
          book_id: book.id,
          content_type: "promotional_description",
          headline: "A must-read",
          body_copy: "Discover First Light by Anya Voss.",
          reason: "Deterministic template",
          source_fields: ["title", "author"],
        },
      ],
      rejected_records: [],
      validation_diagnostics: [],
      summary: { total_records: 1, valid_records: 1, rejected_records: 0, generated_drafts: 1 },
    });

    await post({ bookIds: [book.id] });

    const saved = await prisma.bookMarketingContent.findUnique({ where: { bookId: book.id } });
    expect(saved?.headline).toBe("A must-read");
    expect(saved?.bodyCopy).toBe("Discover First Light by Anya Voss.");
    expect(saved?.sourceFields).toEqual(["title", "author"]);
  });

  it("overwrites the prior draft when a book is regenerated", async () => {
    const book = await prisma.book.create({
      data: { title: "Second Edition", author: "Anya Voss", priceCents: 1500 },
    });
    await prisma.bookMarketingContent.create({
      data: {
        bookId: book.id,
        contentType: "promotional_description",
        headline: "Old headline",
        bodyCopy: "Old copy.",
        reason: "Old reason",
        sourceFields: ["title"],
      },
    });
    generateMarketingContent.mockResolvedValue({
      generated_drafts: [
        {
          book_id: book.id,
          content_type: "promotional_description",
          headline: "New headline",
          body_copy: "New copy.",
          reason: "New reason",
          source_fields: ["title", "author"],
        },
      ],
      rejected_records: [],
      validation_diagnostics: [],
      summary: { total_records: 1, valid_records: 1, rejected_records: 0, generated_drafts: 1 },
    });

    await post({ bookIds: [book.id] });

    const rows = await prisma.bookMarketingContent.findMany({ where: { bookId: book.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.headline).toBe("New headline");
  });

  it("omits rating/description/genre/stock_status for a book missing them, rather than failing", async () => {
    const book = await prisma.book.create({
      data: { title: "Untouched Draft", author: "Nobody Yet", priceCents: 999 },
    });
    generateMarketingContent.mockResolvedValue({
      generated_drafts: [],
      rejected_records: [{ index: 0, record: {} }],
      validation_diagnostics: [],
      summary: { total_records: 1, valid_records: 0, rejected_records: 1, generated_drafts: 0 },
    });

    const response = await post({ bookIds: [book.id] });

    expect(response.status).toBe(200);
    const [catalog] = generateMarketingContent.mock.calls[0]!;
    expect(catalog).toEqual([
      {
        book_id: book.id,
        title: "Untouched Draft",
        author: "Nobody Yet",
        price: 9.99,
        promotional_tag: null,
      },
    ]);
  });

  it("surfaces a content-generator failure without crashing", async () => {
    const book = await prisma.book.create({
      data: { title: "Book", author: "A", priceCents: 1000 },
    });
    generateMarketingContent.mockRejectedValue(
      new ContentGeneratorError("Content generator returned 500", 502),
    );

    const response = await post({ bookIds: [book.id] });
    const responseBody = await response.json();

    expect(response.status).toBe(502);
    expect(responseBody.error.code).toBe("CONTENT_GENERATOR_ERROR");
  });
});
