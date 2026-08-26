import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => apiGet(...args),
    post: (...args: unknown[]) => apiPost(...args),
    patch: (...args: unknown[]) => apiPatch(...args),
  },
  ApiError: class ApiError extends Error {},
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

import { GiftFormPage } from "@/pages/GiftFormPage";
import type { Gift } from "@/types";

const GIFT: Gift = {
  id: "gift-1",
  name: "Enamel Mug",
  priceCents: 1495,
  category: "mug",
  description: null,
  imageUrl: null,
  quantityOnHand: 5,
  createdAt: "",
  updatedAt: "",
};

beforeEach(() => {
  apiGet.mockReset();
  apiPost.mockReset();
  apiPatch.mockReset();
  navigate.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <GiftFormPage />
    </MemoryRouter>,
  );
}

function renderEditPage(id = "gift-1") {
  return render(
    <MemoryRouter initialEntries={[`/gifts/${id}/edit`]}>
      <Routes>
        <Route path="/gifts/:id/edit" element={<GiftFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GiftFormPage", () => {
  it("posts the form as a new gift and navigates to the Gifts tab", async () => {
    apiPost.mockResolvedValue({ id: "gift-1" });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Name"), "Reading Light");
    await user.type(screen.getByLabelText("Price (USD)"), "12.95");
    await user.type(screen.getByLabelText("Category"), "accessory");
    const qty = screen.getByLabelText("Initial Quantity on Hand");
    await user.clear(qty);
    await user.type(qty, "12");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(apiPost).toHaveBeenCalledWith("/gifts", {
      name: "Reading Light",
      priceCents: 1295,
      category: "accessory",
      description: undefined,
      imageUrl: undefined,
      quantityOnHand: 12,
    });
    expect(navigate).toHaveBeenCalledWith("/inventory/gifts");
  });

  it("shows an error message when the create fails", async () => {
    apiPost.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Name"), "Bad Gift");
    await user.type(screen.getByLabelText("Price (USD)"), "1.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to save gift",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("loads an existing gift and PATCHes it on save", async () => {
    apiGet.mockResolvedValue(GIFT);
    apiPatch.mockResolvedValue({ ...GIFT, name: "Updated Mug" });
    const user = userEvent.setup();
    renderEditPage();

    expect(await screen.findByDisplayValue("Enamel Mug")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edit Gift" }),
    ).toBeInTheDocument();

    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Updated Mug");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(apiPatch).toHaveBeenCalledWith("/gifts/gift-1", {
      name: "Updated Mug",
      priceCents: 1495,
      category: "mug",
      description: null,
      imageUrl: null,
      quantityOnHand: 5,
    });
    expect(navigate).toHaveBeenCalledWith("/inventory/gifts");
    expect(apiPost).not.toHaveBeenCalled();
  });
});
