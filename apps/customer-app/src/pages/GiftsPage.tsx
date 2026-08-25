import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { giftToCartProduct, type Gift } from "@/types";
import { MerchCard } from "@/components/MerchCard";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;

export function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetched once, unfiltered, so the category dropdown keeps all options even after
  // the user narrows the list.
  useEffect(() => {
    api
      .get<Gift[]>("/gifts")
      .then((result) => {
        const categories = new Set<string>();
        for (const gift of result) {
          if (gift.category) {
            categories.add(gift.category);
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
      .getPaginated<Gift>(`/gifts?${params.toString()}`)
      .then(({ items, meta }) => {
        if (cancelled) {
          return;
        }
        if (meta) {
          setGifts(items);
          setTotalPages(meta.totalPages);
        } else {
          setTotalPages(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
          setGifts(items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Could not load gifts.");
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
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-8 py-10 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Gifts</h1>
        <p className="mt-2 text-brand-100">
          Mugs, totes, stationery, and more — the perfect pairing for a good book.
        </p>
      </div>

      <form className="mb-8 flex flex-wrap gap-3" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search gifts"
          className="min-w-[220px] flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm capitalize focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
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

      {loading && <p className="py-12 text-center text-stone-500">Loading gifts…</p>}
      {errorMessage && <p className="py-12 text-center text-rose-600">{errorMessage}</p>}
      {!loading && !errorMessage && gifts.length === 0 && (
        <p className="py-12 text-center text-stone-500">No gifts match your search.</p>
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
        {gifts.map((gift) => (
          <MerchCard
            key={gift.id}
            product={giftToCartProduct(gift)}
            outOfStock={gift.quantityOnHand <= 0}
          />
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
