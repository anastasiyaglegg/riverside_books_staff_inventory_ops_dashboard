import type { Book } from "@/types";
import { useBookCoverUrl } from "@/lib/use-book-cover";

export function BookCover({
  book,
  imageClassName,
  fallbackClassName,
}: {
  book: Book;
  imageClassName: string;
  fallbackClassName: string;
}) {
  const coverUrl = useBookCoverUrl(book);

  return coverUrl ? (
    <img
      src={coverUrl}
      alt={book.title}
      className={imageClassName}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className={fallbackClassName}>📖</span>
  );
}
