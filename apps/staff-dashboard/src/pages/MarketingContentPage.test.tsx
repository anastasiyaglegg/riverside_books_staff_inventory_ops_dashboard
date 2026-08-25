import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiGetPaged = vi.fn();
const apiPost = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    getPaged: (...args: unknown[]) => apiGetPaged(...args),
    post: (...args: unknown[]) => apiPost(...args),
  },
  ApiError: class ApiError extends Error {},
}));

import { MarketingContentPage } from "@/pages/MarketingContentPage";
import type { Book } from "@/types";

const BOOKS: Book[] = [
  {
    id: "book-1",
    title: "Rated and Described",
    author: "A",
    isbn: null,
    priceCents: 1000,
    category: null,
    description: "A great book.",
    imageUrl: null,
    rating: 4.5,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "book-2",
    title: "Unrated",
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
];

function pagedResponse(data: Book[]) {
  return {
    data,
    meta: { page: 1, pageSize: 20, totalItems: data.length, totalPages: 1 },
  };
}

beforeEach(() => {
  apiGetPaged.mockReset();
  apiPost.mockReset();
  apiGetPaged.mockResolvedValue(pagedResponse(BOOKS));
});

describe("MarketingContentPage", () => {
  it("lists books with a checkbox per row, disabling Generate until one is picked", async () => {
    render(<MarketingContentPage />);

    expect(await screen.findByText("Rated and Described")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate for Selected/ }),
    ).toBeDisabled();
  });

  it("posts the selected book ids to /marketing/generate", async () => {
    apiPost.mockResolvedValue({
      generated_drafts: [],
      rejected_records: [],
      validation_diagnostics: [],
      summary: {
        total_records: 0,
        valid_records: 0,
        rejected_records: 0,
        generated_drafts: 0,
      },
    });
    const user = userEvent.setup();
    render(<MarketingContentPage />);

    await screen.findByText("Rated and Described");
    await user.click(screen.getByLabelText("Select Rated and Described"));
    await user.click(
      screen.getByRole("button", { name: /Generate for Selected \(1\)/ }),
    );

    expect(apiPost).toHaveBeenCalledWith("/marketing/generate", {
      bookIds: ["book-1"],
    });
  });

  it("shows a generated draft's headline and body copy", async () => {
    apiPost.mockResolvedValue({
      generated_drafts: [
        {
          book_id: "book-1",
          content_type: "promotional_description",
          headline: "A must-read",
          body_copy: "Discover this great book.",
          reason: "Deterministic template",
          source_fields: ["title"],
        },
      ],
      rejected_records: [],
      validation_diagnostics: [
        { index: 0, book_id: "book-1", valid: true, errors: [] },
      ],
      summary: {
        total_records: 1,
        valid_records: 1,
        rejected_records: 0,
        generated_drafts: 1,
      },
    });
    const user = userEvent.setup();
    render(<MarketingContentPage />);

    await screen.findByText("Rated and Described");
    await user.click(screen.getByLabelText("Select Rated and Described"));
    await user.click(
      screen.getByRole("button", { name: /Generate for Selected/ }),
    );

    expect(await screen.findByText("A must-read")).toBeInTheDocument();
    expect(screen.getByText("Discover this great book.")).toBeInTheDocument();
  });

  it("shows why an unrated book was rejected", async () => {
    apiPost.mockResolvedValue({
      generated_drafts: [],
      rejected_records: [{ index: 0, record: { book_id: "book-2" } }],
      validation_diagnostics: [
        {
          index: 0,
          book_id: "book-2",
          valid: false,
          errors: [{ path: "$", message: "missing required field 'rating'" }],
        },
      ],
      summary: {
        total_records: 1,
        valid_records: 0,
        rejected_records: 1,
        generated_drafts: 0,
      },
    });
    const user = userEvent.setup();
    render(<MarketingContentPage />);

    await screen.findByText("Unrated");
    await user.click(screen.getByLabelText("Select Unrated"));
    await user.click(
      screen.getByRole("button", { name: /Generate for Selected/ }),
    );

    expect(
      await screen.findByText("missing required field 'rating'"),
    ).toBeInTheDocument();
    // "Unrated" now appears twice: once in the book table, once as the rejected row's label.
    expect(screen.getAllByText("Unrated").length).toBe(2);
  });
});
