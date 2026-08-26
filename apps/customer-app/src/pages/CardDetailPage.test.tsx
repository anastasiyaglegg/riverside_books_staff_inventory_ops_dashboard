import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CardDetailPage } from "@/pages/CardDetailPage";
import { CartProvider } from "@/lib/cart-context";
import type { Card } from "@/types";

const SAMPLE_CARD: Card = {
  id: "card-1",
  title: "Happy Birthday, Bookworm",
  priceCents: 550,
  occasion: "birthday",
  description: "A card for the reader in your life.",
  imageUrl: null,
  quantityOnHand: 12,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null }),
  });
}

function renderCardDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/cards/card-1"]}>
      <CartProvider>
        <Routes>
          <Route path="/cards/:id" element={<CardDetailPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("CardDetailPage", () => {
  it("shows the card's details and description", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(SAMPLE_CARD)));
    renderCardDetailPage();

    expect(await screen.findByText("Happy Birthday, Bookworm")).toBeInTheDocument();
    expect(screen.getByText("A card for the reader in your life.")).toBeInTheDocument();
    expect(screen.getByText("birthday")).toBeInTheDocument();
    expect(screen.getByText("$5.50")).toBeInTheDocument();
  });

  it("adds the card to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(SAMPLE_CARD)));
    const user = userEvent.setup();
    renderCardDetailPage();

    await user.click(await screen.findByRole("button", { name: "Add to cart" }));

    const stored = JSON.parse(localStorage.getItem("riverside_cart") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].product).toMatchObject({ kind: "card", id: "card-1" });
  });

  it("disables add-to-cart when out of stock", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => jsonResponse({ ...SAMPLE_CARD, quantityOnHand: 0 })),
    );
    renderCardDetailPage();

    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("shows an error message when the card can't be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ data: null, error: { message: "Not found", code: "NOT_FOUND" } }),
        }),
      ),
    );
    renderCardDetailPage();

    expect(await screen.findByText("Not found")).toBeInTheDocument();
  });
});
