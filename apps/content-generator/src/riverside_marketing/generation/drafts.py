"""Deterministic marketing-draft generation for Product D.

The generator consumes records that have already passed the Product D data
validator. It does not validate, mutate, enrich, or send records, and it does
not call an external model.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping


class ContentType(str, Enum):
    """Supported first-slice Product D marketing outputs."""

    PROMOTIONAL_DESCRIPTION = "promotional_description"
    SOCIAL_MEDIA = "social_media"
    EMAIL_CAMPAIGN = "email_campaign"


@dataclass(frozen=True)
class MarketingDraft:
    """Reviewable, structured output produced for one validated book."""

    book_id: str
    content_type: str
    headline: str
    body_copy: str
    reason: str
    source_fields: tuple[str, ...]

    def as_dict(self) -> dict[str, Any]:
        """Return a JSON-friendly representation for review or handoff."""

        return {
            "book_id": self.book_id,
            "content_type": self.content_type,
            "headline": self.headline,
            "body_copy": self.body_copy,
            "reason": self.reason,
            "source_fields": list(self.source_fields),
        }


_STATUS_COPY = {
    "in_stock": "listed as in stock",
    "low_stock": "listed as low stock",
    "out_of_stock": "listed as out of stock",
}

_SOURCE_FIELDS = (
    "book_id",
    "title",
    "author",
    "genre",
    "price",
    "stock_status",
    "description",
    "rating",
    "promotional_tag",
)


def generate_marketing_draft(
    book: Mapping[str, Any],
    content_type: ContentType | str = ContentType.PROMOTIONAL_DESCRIPTION,
) -> MarketingDraft:
    """Generate one deterministic draft from a validated Product D record.

    ``book`` should be the ``ValidationResult.record`` returned by the data
    validation layer. Validation remains a separate concern; this function
    only consumes the validated mapping and applies a content template.
    """

    if not isinstance(book, Mapping):
        raise TypeError("generate_marketing_draft expects a validated book mapping")

    normalized_type = _normalize_content_type(content_type)
    try:
        title = str(book["title"])
        author = str(book["author"])
        genre = str(book["genre"])
        description = str(book["description"])
        price = float(book["price"])
        rating = float(book["rating"])
        stock_status = str(book["stock_status"])
        promotional_tag = book["promotional_tag"]
        book_id = str(book["book_id"])
        status_copy = _STATUS_COPY[stock_status]
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(
            "generate_marketing_draft expects a complete validated Product D book record"
        ) from exc

    rating_copy = f"{rating:.1f}/5"
    price_copy = f"${price:.2f}"
    tag_copy = (
        f" Promotional note: {promotional_tag}."
        if promotional_tag is not None
        else ""
    )

    if normalized_type is ContentType.PROMOTIONAL_DESCRIPTION:
        headline = _headline(title, promotional_tag)
        body_copy = (
            f"Discover {title} by {author}. {description} "
            f"This {genre} title is rated {rating_copy} and is {status_copy}."
            f"{tag_copy}"
        )
    elif normalized_type is ContentType.SOCIAL_MEDIA:
        headline = _headline(title, promotional_tag)
        body_copy = (
            f"{title} by {author} — a {genre} title. {description} "
            f"Reader rating: {rating_copy}. Catalog status: {status_copy}."
            f"{tag_copy}"
        )
    else:
        headline = f"A {genre} pick: {title}"
        if promotional_tag is not None:
            headline = f"{promotional_tag}: {title}"
        body_copy = (
            f"Meet {title} by {author}. {description} "
            f"Listed price: {price_copy}. Reader rating: {rating_copy}. "
            f"Catalog status: {status_copy}."
            f"{tag_copy}"
        )

    reason = (
        f"Deterministic {normalized_type.value} template grounded in the validated "
        f"book description, with title, author, genre, price, rating, stock status, "
        f"and the promotional tag used when present."
    )

    return MarketingDraft(
        book_id=book_id,
        content_type=normalized_type.value,
        headline=headline,
        body_copy=body_copy,
        reason=reason,
        source_fields=_SOURCE_FIELDS,
    )


def generate_marketing_drafts(
    books: list[Mapping[str, Any]],
    content_type: ContentType | str = ContentType.PROMOTIONAL_DESCRIPTION,
) -> tuple[MarketingDraft, ...]:
    """Generate drafts in input order for a collection of validated books."""

    return tuple(
        generate_marketing_draft(book, content_type=content_type) for book in books
    )


def _normalize_content_type(content_type: ContentType | str) -> ContentType:
    if isinstance(content_type, ContentType):
        return content_type
    try:
        return ContentType(content_type)
    except ValueError as exc:
        allowed = ", ".join(item.value for item in ContentType)
        raise ValueError(f"Unsupported content type {content_type!r}; use {allowed}") from exc


def _headline(title: str, promotional_tag: Any) -> str:
    if promotional_tag is not None:
        return f"{promotional_tag}: {title}"
    return f"Discover {title}"
