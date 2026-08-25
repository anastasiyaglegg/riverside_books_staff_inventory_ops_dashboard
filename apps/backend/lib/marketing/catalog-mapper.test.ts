import { describe, it, expect } from "vitest";
import { mapBookToMarketingRecord, mapBooksToMarketingCatalog } from "./catalog-mapper";
import type { BookForMarketing } from "./catalog-mapper";

const FULL_BOOK: BookForMarketing = {
  id: "book-1",
  title: "The Cartographer's Lantern",
  author: "Mara Ellison",
  category: "Historical Fiction",
  priceCents: 1899,
  description: "A story about maps and memory.",
  rating: 4.7,
  inventory: { status: "in_stock" },
};

describe("mapBookToMarketingRecord", () => {
  it("aliases every field a fully-populated book has", () => {
    expect(mapBookToMarketingRecord(FULL_BOOK)).toEqual({
      book_id: "book-1",
      title: "The Cartographer's Lantern",
      author: "Mara Ellison",
      genre: "Historical Fiction",
      price: 18.99,
      stock_status: "in_stock",
      description: "A story about maps and memory.",
      rating: 4.7,
      promotional_tag: null,
    });
  });

  it("converts priceCents to exact decimal dollars", () => {
    expect(mapBookToMarketingRecord({ ...FULL_BOOK, priceCents: 500 }).price).toBe(5);
    expect(mapBookToMarketingRecord({ ...FULL_BOOK, priceCents: 1650 }).price).toBe(16.5);
  });

  it("omits genre rather than defaulting it when category is null", () => {
    const record = mapBookToMarketingRecord({ ...FULL_BOOK, category: null });
    expect(record).not.toHaveProperty("genre");
  });

  it("omits stock_status when there is no inventory row", () => {
    const record = mapBookToMarketingRecord({ ...FULL_BOOK, inventory: null });
    expect(record).not.toHaveProperty("stock_status");
  });

  it("omits description rather than fabricating one when null", () => {
    const record = mapBookToMarketingRecord({ ...FULL_BOOK, description: null });
    expect(record).not.toHaveProperty("description");
  });

  it("omits rating rather than inventing one when null", () => {
    const record = mapBookToMarketingRecord({ ...FULL_BOOK, rating: null });
    expect(record).not.toHaveProperty("rating");
  });

  it("always sends promotional_tag as an explicit null -- we have no such field", () => {
    expect(mapBookToMarketingRecord(FULL_BOOK).promotional_tag).toBeNull();
  });
});

describe("mapBooksToMarketingCatalog", () => {
  it("maps a list in order", () => {
    const result = mapBooksToMarketingCatalog([FULL_BOOK, { ...FULL_BOOK, id: "book-2" }]);
    expect(result.map((r) => r.book_id)).toEqual(["book-1", "book-2"]);
  });

  it("maps an empty list to an empty list", () => {
    expect(mapBooksToMarketingCatalog([])).toEqual([]);
  });
});
