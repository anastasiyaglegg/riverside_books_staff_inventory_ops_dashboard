import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { cardToCartProduct, type Card } from "@/types";
import { MerchCard } from "@/components/MerchCard";
import { PaginationControls } from "@/components/PaginationControls";

const PAGE_SIZE = 20;

export function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [availableOccasions, setAvailableOccasions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetched once, unfiltered, so the occasion dropdown keeps all options even after
  // the user narrows the list.
  useEffect(() => {
    api
      .get<Card[]>("/cards")
      .then((result) => {
        const occasions = new Set<string>();
        for (const card of result) {
          if (card.occasion) {
            occasions.add(card.occasion);
          }
        }
        setAvailableOccasions(Array.from(occasions).sort());
      })
      .catch(() => {
        // Non-critical: the occasion filter just won't have options.
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
    if (occasionFilter) {
      params.set("occasion", occasionFilter);
    }
    params.set("page", String(currentPage));
    params.set("limit", String(PAGE_SIZE));

    api
      .getPaginated<Card>(`/cards?${params.toString()}`)
      .then(({ items, meta }) => {
        if (cancelled) {
          return;
        }
        if (meta) {
          setCards(items);
          setTotalPages(meta.totalPages);
        } else {
          setTotalPages(Math.max(1, Math.ceil(items.length / PAGE_SIZE)));
          setCards(items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof ApiError ? error.message : "Could not load cards.");
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
  }, [submittedQuery, occasionFilter, currentPage]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setCurrentPage(1);
    setSubmittedQuery(searchInput.trim());
  }

  function handleOccasionChange(nextOccasion: string) {
    setCurrentPage(1);
    setOccasionFilter(nextOccasion);
  }

  return (
    <div>
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-800 px-8 py-10 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Greeting Cards</h1>
        <p className="mt-2 text-brand-100">
          A card for every occasion — birthdays, thank-yous, holidays, and blanks to make
          your own.
        </p>
      </div>

      <form className="mb-8 flex flex-wrap gap-3" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search cards"
          className="min-w-[220px] flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <select
          className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm capitalize focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          value={occasionFilter}
          onChange={(event) => handleOccasionChange(event.target.value)}
        >
          <option value="">All occasions</option>
          {availableOccasions.map((occasion) => (
            <option key={occasion} value={occasion}>
              {occasion}
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

      {loading && <p className="py-12 text-center text-stone-500">Loading cards…</p>}
      {errorMessage && <p className="py-12 text-center text-rose-600">{errorMessage}</p>}
      {!loading && !errorMessage && cards.length === 0 && (
        <p className="py-12 text-center text-stone-500">No cards match your search.</p>
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
        {cards.map((card) => (
          <MerchCard
            key={card.id}
            product={cardToCartProduct(card)}
            outOfStock={card.quantityOnHand <= 0}
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
