import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoritesProvider, useFavorites } from "@/lib/favorites-context";
import type { Book } from "@/types";

const BOOK: Book = {
  id: "a",
  title: "Book A",
  author: "Author",
  isbn: null,
  priceCents: 1000,
  category: null,
  description: null,
  imageUrl: null,
  createdAt: "",
  updatedAt: "",
};

function Harness() {
  const { favorites, isFavorite, toggle, remove } = useFavorites();
  return (
    <div>
      <p data-testid="count">{favorites.length}</p>
      <p data-testid="is-fav">{String(isFavorite("a"))}</p>
      <button onClick={() => toggle(BOOK)}>Toggle</button>
      <button onClick={() => remove("a")}>Remove</button>
    </div>
  );
}

function renderFavs() {
  return render(
    <FavoritesProvider>
      <Harness />
    </FavoritesProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("FavoritesProvider", () => {
  it("toggles a book on and off", async () => {
    const user = userEvent.setup();
    renderFavs();
    expect(screen.getByTestId("is-fav")).toHaveTextContent("false");
    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("is-fav")).toHaveTextContent("true");
    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("is-fav")).toHaveTextContent("false");
  });

  it("persists favorites to localStorage", async () => {
    const user = userEvent.setup();
    renderFavs();
    await user.click(screen.getByText("Toggle"));
    const stored = JSON.parse(localStorage.getItem("riverside_favorites") ?? "[]");
    expect(stored[0].id).toBe("a");
  });

  it("remove drops the favorite", async () => {
    const user = userEvent.setup();
    renderFavs();
    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    await user.click(screen.getByText("Remove"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
