import { Link } from "react-router-dom";
import { bookToCartProduct, type Book } from "@/types";
import { formatCents } from "@/lib/money";
import { StockBadge } from "@/components/StockBadge";
import { BookCover } from "@/components/BookCover";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToCartButton } from "@/components/AddToCartButton";

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      to={`/books/${book.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative flex aspect-[3/4] items-center justify-center bg-brand-50">
        <BookCover book={book} imageClassName="h-full w-full object-cover" fallbackClassName="text-4xl" />
        <FavoriteButton book={book} className="absolute right-2 top-2 shadow-sm" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-2 font-semibold text-stone-900 group-hover:text-brand-700">
          {book.title}
        </p>
        <p className="text-sm text-stone-500">{book.author}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-semibold text-brand-800">{formatCents(book.priceCents)}</span>
          <StockBadge status={book.inventory?.status} />
        </div>
        <AddToCartButton
          product={bookToCartProduct(book)}
          outOfStock={book.inventory?.status === "out_of_stock"}
          className="mt-3 w-full"
        />
      </div>
    </Link>
  );
}
