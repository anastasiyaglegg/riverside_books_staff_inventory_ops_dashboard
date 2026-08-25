import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Book } from "@/types";

const STORAGE_KEY = "riverside_favorites";

type FavoritesContextValue = {
  favorites: Book[];
  isFavorite: (bookId: string) => boolean;
  toggle: (book: Book) => void;
  remove: (bookId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function loadStoredFavorites(): Book[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as Book[];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Book[]>(() => loadStoredFavorites());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  function isFavorite(bookId: string) {
    return favorites.some((b) => b.id === bookId);
  }

  function toggle(book: Book) {
    setFavorites((prev) =>
      prev.some((b) => b.id === book.id)
        ? prev.filter((b) => b.id !== book.id)
        : [...prev, book],
    );
  }

  function remove(bookId: string) {
    setFavorites((prev) => prev.filter((b) => b.id !== bookId));
  }

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggle, remove }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
