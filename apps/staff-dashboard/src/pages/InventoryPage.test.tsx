import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const apiGetPaged = vi.fn();
const apiPatch = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    getPaged: (...args: unknown[]) => apiGetPaged(...args),
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
      rating: null,
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
      rating: null,
      createdAt: "",
      updatedAt: "",
    },
  },
];

function pagedResponse(
  data: Inventory[],
  meta: Partial<{
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }> = {},
) {
  return {
    data,
    meta: {
      page: 1,
      pageSize: 20,
      totalItems: data.length,
      totalPages: 1,
      ...meta,
    },
  };
}

beforeEach(() => {
  apiGetPaged.mockReset();
  apiPatch.mockReset();
});

describe("InventoryPage", () => {
  it("renders every title with its stock status badge", async () => {
    apiGetPaged.mockResolvedValue(pagedResponse(INVENTORY));
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
    apiGetPaged.mockResolvedValue(pagedResponse(INVENTORY));
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
    apiGetPaged.mockResolvedValue(pagedResponse(INVENTORY));
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

  it("shows the current page and total pages", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 2, totalPages: 5, totalItems: 100 }),
    );
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("disables Skip to First and Previous on the first page", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 1, totalPages: 5, totalItems: 100 }),
    );
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("Page 1 of 5");
    expect(screen.getByLabelText("Skip to first page")).toBeDisabled();
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).toBeEnabled();
    expect(screen.getByLabelText("Skip to last page")).toBeEnabled();
  });

  it("disables Next and Skip to Last on the final page", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 5, totalPages: 5, totalItems: 100 }),
    );
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("Page 5 of 5");
    expect(screen.getByLabelText("Next page")).toBeDisabled();
    expect(screen.getByLabelText("Skip to last page")).toBeDisabled();
  });

  it("re-fetches with the new page when Skip to Last is clicked", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 1, totalPages: 5, totalItems: 100 }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("Page 1 of 5");
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 5, totalPages: 5, totalItems: 100 }),
    );
    await user.click(screen.getByLabelText("Skip to last page"));

    expect(await screen.findByText("Page 5 of 5")).toBeInTheDocument();
    expect(apiGetPaged).toHaveBeenLastCalledWith(
      "/inventory?page=5&pageSize=20",
    );
  });

  it("jumps to a specific page typed into the page box", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 1, totalPages: 5, totalItems: 100 }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("Page 1 of 5");
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 3, totalPages: 5, totalItems: 100 }),
    );
    await user.type(screen.getByLabelText("Go to page"), "3");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(await screen.findByText("Page 3 of 5")).toBeInTheDocument();
    expect(apiGetPaged).toHaveBeenLastCalledWith(
      "/inventory?page=3&pageSize=20",
    );
  });

  it("clamps a jump target beyond the last page", async () => {
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 1, totalPages: 5, totalItems: 100 }),
    );
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InventoryPage />
      </MemoryRouter>,
    );

    await screen.findByText("Page 1 of 5");
    apiGetPaged.mockResolvedValue(
      pagedResponse(INVENTORY, { page: 5, totalPages: 5, totalItems: 100 }),
    );
    await user.type(screen.getByLabelText("Go to page"), "99");
    await user.click(screen.getByRole("button", { name: "Go" }));

    expect(await screen.findByText("Page 5 of 5")).toBeInTheDocument();
    expect(apiGetPaged).toHaveBeenLastCalledWith(
      "/inventory?page=5&pageSize=20",
    );
  });
});
