import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { CustomerProvider } from "@/lib/customer-context";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import type { Book } from "@/types";

const BASE_BOOK: Book = {
  id: "book-1",
  title: "The Cartographer's Lantern",
  author: "Mara Ellison",
  isbn: null,
  priceCents: 1899,
  category: "Historical Fiction",
  description: "A story about maps and memory.",
  imageUrl: null,
  rating: 4.7,
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
  marketingContent: null,
};

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null }),
  });
}

function renderBookDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/books/book-1"]}>
      <FavoritesProvider>
        <CartProvider>
          <CustomerProvider>
            <Routes>
              <Route path="/books/:id" element={<BookDetailPage />} />
            </Routes>
          </CustomerProvider>
        </CartProvider>
      </FavoritesProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("BookDetailPage marketing content", () => {
  it("shows nothing when marketingContent is null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(BASE_BOOK)));
    renderBookDetailPage();

    expect(await screen.findByText("The Cartographer's Lantern")).toBeInTheDocument();
    expect(screen.queryByText("Pre-order for pickup")).toBeInTheDocument();
    // No headline/body-copy card renders when there's nothing to show.
    expect(document.querySelector(".border-brand-200")).not.toBeInTheDocument();
  });

  it("renders the generated headline and body copy when present", async () => {
    const bookWithContent: Book = {
      ...BASE_BOOK,
      marketingContent: {
        headline: "A must-read",
        bodyCopy: "Discover The Cartographer's Lantern by Mara Ellison.",
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(bookWithContent)));
    renderBookDetailPage();

    expect(await screen.findByText("A must-read")).toBeInTheDocument();
    expect(
      screen.getByText("Discover The Cartographer's Lantern by Mara Ellison."),
    ).toBeInTheDocument();
  });
});
