import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { GiftsPage } from "@/pages/GiftsPage";
import { CartProvider } from "@/lib/cart-context";
import type { Gift } from "@/types";

const SAMPLE_GIFT: Gift = {
  id: "gift-1",
  name: "Riverside Enamel Mug",
  priceCents: 1495,
  category: "mug",
  description: null,
  imageUrl: null,
  quantityOnHand: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function jsonResponse(data: unknown, meta?: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data, error: null, ...(meta ? { meta } : {}) }),
  });
}

function renderGiftsPage() {
  return render(
    <MemoryRouter>
      <CartProvider>
        <GiftsPage />
      </CartProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("GiftsPage", () => {
  it("shows an empty state when there are no matches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse([])));
    renderGiftsPage();

    expect(await screen.findByText("No gifts match your search.")).toBeInTheDocument();
  });

  it("renders gifts and adds one to the cart", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => jsonResponse([SAMPLE_GIFT])));
    const user = userEvent.setup();
    renderGiftsPage();

    expect(await screen.findByText("Riverside Enamel Mug")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    const stored = JSON.parse(localStorage.getItem("riverside_cart") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].product).toMatchObject({ kind: "gift", id: "gift-1", name: "Riverside Enamel Mug" });
  });

  it("disables add-to-cart for an out-of-stock gift", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => jsonResponse([{ ...SAMPLE_GIFT, quantityOnHand: 0 }])),
    );
    renderGiftsPage();

    expect(await screen.findByRole("button", { name: "Out of stock" })).toBeDisabled();
  });
});
