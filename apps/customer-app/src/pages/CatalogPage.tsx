import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Book } from "@/types";
import { BookCard } from "@/components/BookCard";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;

export function CatalogPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetched once, unfiltered, so the category dropdown doesn't collapse to a
  // single option once the user has already narrowed results by category.
  useEffect(() => {
    api
      .get<Book[]>("/books")
      .then((result) => {
        const categories = new Set<string>();
        for (const book of result) {
          if (book.category) {
            categories.add(book.category);
          }
        }
        setAvailableCategories(Array.from(categories).sort());
      })
      .catch(() => {
        // Non-critical: the category filter just won't have options.
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    const params = new URLSearchParams();
    if (submittedQuery) {
      params.set("q", submittedQuery);
    }
    if (categoryFilter) {
      params.set("category", categoryFilter);
    }
    params.set("page", String(currentPage));
    params.set("limit", String(PAGE_SIZE));

    api
      .getPaginated<Book>(`/books?${params.toString()}`)
      .then(({ items, meta }) => {
        if (cancelled) {
          return;
        }
        if (meta) {
          // Backend paginated server-side -- `items` is already just this page.
          setBooks(items);
          setTotalPages(meta.totalPages);
        } else {
          // Backend hasn't deployed pagination yet, so `items` is every match --
          // slice it client-side so the controls still work.
          setTotalPages(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
          setBooks(items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Could not load the catalog.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [submittedQuery, categoryFilter, currentPage]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCurrentPage(1);
    setSubmittedQuery(searchInput.trim());
  }

  function handleCategoryChange(nextCategory: string) {
    setCurrentPage(1);
    setCategoryFilter(nextCategory);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-6 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-8 py-10 text-white">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find your next read</h1>
          <p className="mt-2 text-brand-100">
            Search our shelves, check what's in stock, and reserve a copy for pickup.
          </p>
        </div>
        <img
          src="/logo-hero.png"
          alt="Riverside Books and Gifts"
          className="hidden h-40 w-40 shrink-0 rounded-full border-4 border-white/20 shadow-lg sm:block"
        />
      </div>

      <form className="mb-8 flex flex-wrap gap-3" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search by title or author"
          className="min-w-[220px] flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          value={categoryFilter}
          onChange={(event) => handleCategoryChange(event.target.value)}
        >
          <option value="">All categories</option>
          {availableCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          Search
        </button>
      </form>

      {loading && <p className="py-12 text-center text-stone-500">Loading catalog…</p>}
      {errorMessage && <p className="py-12 text-center text-rose-600">{errorMessage}</p>}
      {!loading && !errorMessage && books.length === 0 && (
        <p className="py-12 text-center text-stone-500">
          No matches. Try a different title, author, or category.
        </p>
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {!loading && !errorMessage && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
