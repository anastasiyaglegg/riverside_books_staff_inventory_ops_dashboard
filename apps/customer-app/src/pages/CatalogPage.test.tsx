import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { CatalogPage } from "@/pages/CatalogPage";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import type { Book } from "@/types";

const SAMPLE_BOOK: Book = {
  id: "book-1",
  title: "The Pragmatic Programmer",
  author: "David Thomas",
  isbn: null,
  priceCents: 2499,
  category: "Technology",
  description: null,
  imageUrl: null,
  rating: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  inventory: {
    id: "inv-1",
    bookId: "book-1",
    quantityOnHand: 5,
    reorderThreshold: 2,
    status: "in_stock",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

function makeBook(index: number): Book {
  return { ...SAMPLE_BOOK, id: `book-${index}`, title: `Book ${index}` };
}

function jsonResponse(data: unknown, meta?: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null, ...(meta ? { meta } : {}) }),
  });
}

function renderCatalogPage() {
  return render(
    <MemoryRouter>
      <FavoritesProvider>
        <CartProvider>
          <CatalogPage />
        </CartProvider>
      </FavoritesProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CatalogPage", () => {
  it("shows a clear empty state when the search has no matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse([])));
    renderCatalogPage();

    expect(
      await screen.findByText("No matches. Try a different title, author, or category."),
    ).toBeInTheDocument();
  });

  it("renders matching books with their stock status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse([SAMPLE_BOOK])));
    renderCatalogPage();

    expect(await screen.findByText("The Pragmatic Programmer")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
  });

  it("paginates client-side when the backend hasn't deployed pagination yet (no meta)", async () => {
    const allBooks = Array.from({ length: 25 }, (_, i) => makeBook(i));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(allBooks)));
    const user = userEvent.setup();
    renderCatalogPage();

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Book 0")).toBeInTheDocument();
    expect(screen.queryByText("Book 20")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Next page"));

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Book 20")).toBeInTheDocument();
    expect(screen.queryByText("Book 0")).not.toBeInTheDocument();
  });

  it("uses server-driven pagination directly when the backend returns meta", async () => {
    const pageOneBooks = Array.from({ length: 20 }, (_, i) => makeBook(i));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        jsonResponse(pageOneBooks, { page: 1, pageSize: 20, totalItems: 45, totalPages: 3 }),
      ),
    );
    renderCatalogPage();

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Book 0")).toBeInTheDocument();
  });
});
