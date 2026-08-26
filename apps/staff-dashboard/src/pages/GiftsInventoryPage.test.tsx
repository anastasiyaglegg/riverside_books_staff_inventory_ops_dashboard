import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const apiGet = vi.fn();
const apiPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { GiftsInventoryPage } from "@/pages/GiftsInventoryPage";
import type { Gift } from "@/types";

const GIFT: Gift = {
  id: "gift-1",
  name: "Enamel Mug",
  priceCents: 1495,
  category: "mug",
  description: null,
  imageUrl: null,
  quantityOnHand: 3,
  createdAt: "",
  updatedAt: "",
};

const OUT_OF_STOCK_GIFT: Gift = {
  ...GIFT,
  id: "gift-2",
  name: "Canvas Tote",
  quantityOnHand: 0,
};

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
  apiGet.mockResolvedValue([GIFT, OUT_OF_STOCK_GIFT]);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/inventory/gifts"]}>
      <GiftsInventoryPage />
    </MemoryRouter>,
  );
}

describe("GiftsInventoryPage", () => {
  it("renders the Books/Cards/Gifts tab bar with Gifts active", async () => {
    renderPage();
    await screen.findByText("Enamel Mug");

    expect(screen.getByRole("link", { name: "Gifts" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Books" })).not.toHaveClass(
      "active",
    );
  });

  it("links Add Gift to /gifts/new", async () => {
    renderPage();
    await screen.findByText("Enamel Mug");

    expect(screen.getByRole("link", { name: "Add Gift" })).toHaveAttribute(
      "href",
      "/gifts/new",
    );
  });

  it("lists gifts with a stock status", async () => {
    renderPage();

    expect(await screen.findByText("Enamel Mug")).toBeInTheDocument();
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("filters to out-of-stock only", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Enamel Mug");

    await user.click(screen.getByLabelText("Out of stock only"));

    expect(screen.queryByText("Enamel Mug")).not.toBeInTheDocument();
    expect(screen.getByText("Canvas Tote")).toBeInTheDocument();
  });

  it("restocks a gift via PATCH /gifts/:id", async () => {
    apiPatch.mockResolvedValue({ ...GIFT, quantityOnHand: 25 });
    const user = userEvent.setup();
    renderPage();

    const giftRow = (await screen.findByText("Enamel Mug")).closest("tr")!;
    const qtyInput = within(giftRow).getByRole("spinbutton");
    await user.clear(qtyInput);
    await user.type(qtyInput, "25");
    await user.click(within(giftRow).getByRole("button", { name: "Save" }));

    expect(apiPatch).toHaveBeenCalledWith("/gifts/gift-1", {
      quantityOnHand: 25,
    });
  });
});
