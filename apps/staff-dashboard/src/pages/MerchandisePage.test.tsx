import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiGet = vi.fn();
const apiPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { MerchandisePage } from "@/pages/MerchandisePage";
import type { Card, Gift } from "@/types";

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

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
  apiGet.mockImplementation((path: string) =>
    Promise.resolve(path.startsWith("/gifts") ? [GIFT] : [CARD]),
  );
});

describe("MerchandisePage", () => {
  it("lists gifts and cards with a stock status", async () => {
    render(<MerchandisePage />);

    expect(await screen.findByText("Enamel Mug")).toBeInTheDocument();
    expect(screen.getByText("Birthday Card")).toBeInTheDocument();
    // The out-of-stock card is flagged.
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("filters to out-of-stock only", async () => {
    const user = userEvent.setup();
    render(<MerchandisePage />);
    await screen.findByText("Enamel Mug");

    await user.click(screen.getByLabelText("Out of stock only"));

    expect(screen.queryByText("Enamel Mug")).not.toBeInTheDocument();
    expect(screen.getByText("Birthday Card")).toBeInTheDocument();
  });

  it("restocks a gift via PATCH /gifts/:id", async () => {
    apiPatch.mockResolvedValue({ ...GIFT, quantityOnHand: 25 });
    const user = userEvent.setup();
    render(<MerchandisePage />);

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
