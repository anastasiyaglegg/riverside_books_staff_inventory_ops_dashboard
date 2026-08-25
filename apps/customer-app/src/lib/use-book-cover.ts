import { useEffect, useState } from "react";
import { fetchOpenLibraryCoverUrl } from "@/lib/book-cover";
import type { Book } from "@/types";

// Prefers a supplied imageUrl (real data, once staff add it via Product B) and only
// falls back to an Open Library lookup by title/author when that's empty. Works from
// plain fields so callers without a full Book (e.g. a normalized cart line) can use it.
export function useCoverUrl(
  title: string,
  author: string,
  imageUrl: string | null,
): string | null {
  const [coverUrl, setCoverUrl] = useState<string | null>(imageUrl);

  useEffect(() => {
    if (imageUrl) {
      setCoverUrl(imageUrl);
      return;
    }

    let cancelled = false;
    setCoverUrl(null);
    fetchOpenLibraryCoverUrl(title, author).then((url) => {
      if (!cancelled) {
        setCoverUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, title, author]);

  return coverUrl;
}

export function useBookCoverUrl(book: Book): string | null {
  return useCoverUrl(book.title, book.author, book.imageUrl);
}
