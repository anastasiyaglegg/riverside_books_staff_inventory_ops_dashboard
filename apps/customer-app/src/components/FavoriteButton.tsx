import { useFavorites } from "@/lib/favorites-context";
import type { Book } from "@/types";

// Heart toggle. Isolates its click so it works when rendered inside a card <Link>.
export function FavoriteButton({ book, className = "" }: { book: Book; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(book.id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(book);
      }}
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-colors ${
        active
          ? "border-rose-200 bg-rose-50 text-rose-500"
          : "border-stone-200 bg-white/90 text-stone-400 hover:text-rose-500"
      } ${className}`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
