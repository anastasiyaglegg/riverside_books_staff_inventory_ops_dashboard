import type { CartProduct, ProductKind } from "@/types";
import { useCoverUrl } from "@/lib/use-book-cover";

const KIND_FALLBACK: Record<ProductKind, string> = {
  book: "📖",
  gift: "🎁",
  card: "💌",
};

// Books resolve an Open Library cover from title/author; gifts and cards only have their
// own imageUrl, so this branches on kind. Kept as two components so the cover hook isn't
// called for gifts/cards (which would fire a pointless book search).
function BookThumb({
  product,
  imageClassName,
  fallbackClassName,
}: {
  product: CartProduct;
  imageClassName: string;
  fallbackClassName: string;
}) {
  const coverUrl = useCoverUrl(product.name, product.subtitle ?? "", product.imageUrl);
  return coverUrl ? (
    <img src={coverUrl} alt={product.name} className={imageClassName} loading="lazy" decoding="async" />
  ) : (
    <span className={fallbackClassName}>{KIND_FALLBACK.book}</span>
  );
}

export function ProductThumb({
  product,
  imageClassName,
  fallbackClassName,
}: {
  product: CartProduct;
  imageClassName: string;
  fallbackClassName: string;
}) {
  if (product.kind === "book") {
    return (
      <BookThumb
        product={product}
        imageClassName={imageClassName}
        fallbackClassName={fallbackClassName}
      />
    );
  }

  return product.imageUrl ? (
    <img
      src={product.imageUrl}
      alt={product.name}
      className={imageClassName}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className={fallbackClassName}>{KIND_FALLBACK[product.kind]}</span>
  );
}
