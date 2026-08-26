import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const apiPost = vi.fn();
const navigate = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => apiPost(...args) },
  ApiError: class ApiError extends Error {},
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

import { GiftFormPage } from "@/pages/GiftFormPage";

beforeEach(() => {
  apiPost.mockReset();
  navigate.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <GiftFormPage />
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
});
