import { Link } from "react-router-dom";
import { useFavorites } from "@/lib/favorites-context";
import { BookCard } from "@/components/BookCard";

export function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-stone-900">My Favorites</h1>
      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-500">
            No favorites yet. Tap the ♡ on any book to save it here.
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-block rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {favorites.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
