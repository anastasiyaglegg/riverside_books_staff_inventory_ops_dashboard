import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

import { InventoryPage } from "@/pages/InventoryPage";
import type { Inventory } from "@/types";

const INVENTORY: Inventory[] = [
  {
    id: "inv-1",
    bookId: "book-1",
    quantityOnHand: 5,
    reorderThreshold: 2,
    status: "in_stock",
    lastAdjustedById: null,
    updatedAt: "2026-08-01T00:00:00.000Z",
    book: {
      id: "book-1",
      title: "In Stock Book",
      author: "A",
      isbn: null,
      priceCents: 1000,
      category: null,
      description: null,
      imageUrl: null,
      createdAt: "",
      updatedAt: "",
    },
  },
  {
    id: "inv-2",
    bookId: "book-2",
    quantityOnHand: 0,
    reorderThreshold: 2,
    status: "out_of_stock",
    lastAdjustedById: null,
    updatedAt: "2026-08-01T00:00:00.000Z",
    book: {
      id: "book-2",
      title: "Out Of Stock Book",
      author: "B",
      isbn: null,
      priceCents: 1000,
      category: null,
      description: null,
      imageUrl: null,
      createdAt: "",
      updatedAt: "",
    },
  },
];

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset();
});

describe("InventoryPage", () => {
  it("renders every title with its stock status badge", async () => {
    apiGet.mockResolvedValue(INVENTORY);
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("In Stock Book")).toBeInTheDocument();
    expect(screen.getByText("Out Of Stock Book")).toBeInTheDocument();
    expect(screen.getByText("In Stock")).toBeInTheDocument();
    expect(screen.getByText("Out of Stock")).toBeInTheDocument();
  });

  it("filters to Needs Reorder only when the toggle is checked", async () => {
    apiGet.mockResolvedValue(INVENTORY);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("In Stock Book");
    await user.click(screen.getByLabelText("Needs Reorder only"));

    expect(screen.queryByText("In Stock Book")).not.toBeInTheDocument();
    expect(screen.getByText("Out Of Stock Book")).toBeInTheDocument();
  });

  it("saves an edited quantity via the API", async () => {
    apiGet.mockResolvedValue(INVENTORY);
    apiPatch.mockResolvedValue({
      ...INVENTORY[0],
      quantityOnHand: 9,
      status: "in_stock",
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    const qtyInput = (await screen.findAllByRole("spinbutton"))[0]!;
    await user.clear(qtyInput);
    await user.type(qtyInput, "9");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]!);

    expect(apiPatch).toHaveBeenCalledWith("/inventory/book-1", {
      quantityOnHand: 9,
    });
  });
});
