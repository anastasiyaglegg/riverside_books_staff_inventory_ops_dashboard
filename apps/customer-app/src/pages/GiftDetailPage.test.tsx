import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GiftDetailPage } from "@/pages/GiftDetailPage";
import { CartProvider } from "@/lib/cart-context";
import type { Gift } from "@/types";

const SAMPLE_GIFT: Gift = {
  id: "gift-1",
  name: "Riverside Enamel Mug",
  priceCents: 1495,
  category: "mug",
  description: "A sturdy mug for your morning chapter.",
  imageUrl: null,
  quantityOnHand: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null }),
  });
}

function renderGiftDetailPage() {
  return render(
    <MemoryRouter initialEntries={["/gifts/gift-1"]}>
      <CartProvider>
        <Routes>
          <Route path="/gifts/:id" element={<GiftDetailPage />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("GiftDetailPage", () => {
  it("shows the gift's details and description", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(SAMPLE_GIFT)));
    renderGiftDetailPage();

    expect(await screen.findByText("Riverside Enamel Mug")).toBeInTheDocument();
    expect(screen.getByText("A sturdy mug for your morning chapter.")).toBeInTheDocument();
    expect(screen.getByText("mug")).toBeInTheDocument();
    expect(screen.getByText("$14.95")).toBeInTheDocument();
  });

  it("adds the gift to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse(SAMPLE_GIFT)));
    const user = userEvent.setup();
    renderGiftDetailPage();

    await user.click(await screen.findByRole("button", { name: "Add to cart" }));

    const stored = JSON.parse(localStorage.getItem("riverside_cart") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].product).toMatchObject({ kind: "gift", id: "gift-1" });
  });

  it("disables add-to-cart when out of stock", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => jsonResponse({ ...SAMPLE_GIFT, quantityOnHand: 0 })),
    );
    renderGiftDetailPage();

    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("shows an error message when the gift can't be loaded", async () => {
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
    renderGiftDetailPage();

    expect(await screen.findByText("Not found")).toBeInTheDocument();
  });
});
