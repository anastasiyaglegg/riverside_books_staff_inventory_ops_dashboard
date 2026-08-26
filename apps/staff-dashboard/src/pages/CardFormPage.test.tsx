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

import { CardFormPage } from "@/pages/CardFormPage";

beforeEach(() => {
  apiPost.mockReset();
  navigate.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CardFormPage />
    </MemoryRouter>,
  );
}

describe("CardFormPage", () => {
  it("posts the form as a new card and navigates to the Cards tab", async () => {
    apiPost.mockResolvedValue({ id: "card-1" });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Title"), "Happy Anniversary");
    await user.type(screen.getByLabelText("Price (USD)"), "4.95");
    await user.type(screen.getByLabelText("Occasion"), "anniversary");
    const qty = screen.getByLabelText("Initial Quantity on Hand");
    await user.clear(qty);
    await user.type(qty, "10");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(apiPost).toHaveBeenCalledWith("/cards", {
      title: "Happy Anniversary",
      priceCents: 495,
      occasion: "anniversary",
      description: undefined,
      imageUrl: undefined,
      quantityOnHand: 10,
    });
    expect(navigate).toHaveBeenCalledWith("/inventory/cards");
  });

  it("shows an error message when the create fails", async () => {
    apiPost.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Title"), "Bad Card");
    await user.type(screen.getByLabelText("Price (USD)"), "1.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to save card",
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});
