import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const apiGet = vi.fn();
const apiPatch = vi.fn();
const apiDelete = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
    delete: (...args: unknown[]) => apiDelete(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { CardsInventoryPage } from "@/pages/CardsInventoryPage";
import type { Card } from "@/types";

const CARD: Card = {
  id: "card-1",
  title: "Birthday Card",
  priceCents: 550,
  occasion: "birthday",
  description: null,
  imageUrl: null,
  quantityOnHand: 0,
  createdAt: "",
  updatedAt: "",
};

const IN_STOCK_CARD: Card = {
  ...CARD,
  id: "card-2",
  title: "Thank You Card",
  quantityOnHand: 10,
};

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
  apiDelete.mockReset();
  apiGet.mockResolvedValue([CARD, IN_STOCK_CARD]);
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/inventory/cards"]}>
      <CardsInventoryPage />
    </MemoryRouter>,
  );
}

describe("CardsInventoryPage", () => {
  it("renders the Books/Cards/Gifts tab bar with Cards active", async () => {
    renderPage();
    await screen.findByText("Birthday Card");

    expect(screen.getByRole("link", { name: "Cards" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Books" })).not.toHaveClass(
      "active",
    );
  });

  it("links Add Card to /cards/new", async () => {
    renderPage();
    await screen.findByText("Birthday Card");

    expect(screen.getByRole("link", { name: "Add Card" })).toHaveAttribute(
      "href",
      "/cards/new",
    );
  });

  it("lists cards with a stock status", async () => {
    renderPage();

    expect(await screen.findByText("Birthday Card")).toBeInTheDocument();
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("filters to out-of-stock only", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Birthday Card");

    await user.click(screen.getByLabelText("Out of stock only"));

    expect(screen.getByText("Birthday Card")).toBeInTheDocument();
    expect(screen.queryByText("Thank You Card")).not.toBeInTheDocument();
  });

  it("links Edit to the card's edit route", async () => {
    renderPage();
    await screen.findByText("Birthday Card");

    expect(screen.getAllByRole("link", { name: "Edit" })[0]).toHaveAttribute(
      "href",
      "/cards/card-1/edit",
    );
  });

  it("deletes a card after confirming", async () => {
    apiDelete.mockResolvedValue({ id: "card-1" });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Birthday Card");
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]!);
    await user.click(screen.getByRole("button", { name: "Confirm?" }));

    expect(apiDelete).toHaveBeenCalledWith("/cards/card-1");
    expect(screen.queryByText("Birthday Card")).not.toBeInTheDocument();
  });

  it("restocks a card via PATCH /cards/:id", async () => {
    apiPatch.mockResolvedValue({ ...CARD, quantityOnHand: 25 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Birthday Card");
    const qtyInput = screen.getAllByRole("spinbutton")[0]!;
    await user.clear(qtyInput);
    await user.type(qtyInput, "25");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    expect(apiPatch).toHaveBeenCalledWith("/cards/card-1", {
      quantityOnHand: 25,
    });
  });
});
