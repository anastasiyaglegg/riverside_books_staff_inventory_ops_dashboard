import json
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from riverside_marketing.data import BookDataValidator  # noqa: E402
from riverside_marketing.generation import (  # noqa: E402
    ContentType,
    MarketingDraft,
    generate_marketing_draft,
    generate_marketing_drafts,
)


SAMPLE_PATH = PROJECT_ROOT / "data" / "books.sample.json"
EDGE_CASE_PATH = (
    PROJECT_ROOT / "data" / "fixtures" / "books.marketing-edge-cases.json"
)


def _validated_records(path: Path) -> tuple[dict, ...]:
    report = BookDataValidator().load_and_validate(path)
    assert report.all_valid
    return report.valid_records


class MarketingDraftGenerationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.book = _validated_records(SAMPLE_PATH)[0]

    def test_promotional_description_has_required_structured_fields(self) -> None:
        draft = generate_marketing_draft(self.book)

        self.assertIsInstance(draft, MarketingDraft)
        self.assertEqual(draft.book_id, "RB-001")
        self.assertEqual(draft.content_type, "promotional_description")
        self.assertEqual(draft.headline, "Staff Pick: The Cartographer's Lantern")
        self.assertIn("Mara Ellison", draft.body_copy)
        self.assertIn("Historical Fiction", draft.body_copy)
        self.assertIn("4.7/5", draft.body_copy)
        self.assertIn("listed as in stock", draft.body_copy)
        self.assertIn("Staff Pick", draft.body_copy)
        self.assertIn("Deterministic promotional_description template", draft.reason)

    def test_generation_is_deterministic_and_json_friendly(self) -> None:
        first = generate_marketing_draft(self.book)
        second = generate_marketing_draft(self.book)

        self.assertEqual(first, second)
        self.assertEqual(first.as_dict()["source_fields"], [
            "book_id",
            "title",
            "author",
            "genre",
            "price",
            "stock_status",
            "description",
            "rating",
            "promotional_tag",
        ])
        json.dumps(first.as_dict())

    def test_supported_content_types_produce_distinct_structured_drafts(self) -> None:
        drafts = [
            generate_marketing_draft(self.book, content_type)
            for content_type in ContentType
        ]

        self.assertEqual(
            [draft.content_type for draft in drafts],
            [item.value for item in ContentType],
        )
        self.assertEqual(len({draft.body_copy for draft in drafts}), 3)
        self.assertEqual(
            drafts[2].headline,
            "Staff Pick: The Cartographer's Lantern",
        )
        self.assertIn("$18.99", drafts[2].body_copy)
        for draft in drafts:
            self.assertEqual(draft.book_id, self.book["book_id"])
            self.assertTrue(draft.headline)
            self.assertTrue(draft.body_copy)
            self.assertTrue(draft.reason)

    def test_null_promotional_tag_does_not_create_unsupported_copy(self) -> None:
        book = _validated_records(EDGE_CASE_PATH)[0]

        draft = generate_marketing_draft(book)

        self.assertEqual(draft.headline, "Discover A Window for Every Season")
        self.assertNotIn("Promotional note", draft.body_copy)
        self.assertIn("listed as in stock", draft.body_copy)

    def test_out_of_stock_status_is_preserved_without_inventory_logic(self) -> None:
        book = _validated_records(EDGE_CASE_PATH)[1]

        draft = generate_marketing_draft(book, ContentType.SOCIAL_MEDIA)

        self.assertIn("listed as out of stock", draft.body_copy)
        self.assertNotIn("order", draft.body_copy.lower())
        self.assertNotIn("restock", draft.body_copy.lower())

    def test_collection_generation_preserves_input_order(self) -> None:
        books = _validated_records(SAMPLE_PATH)

        drafts = generate_marketing_drafts(books, ContentType.EMAIL_CAMPAIGN)

        self.assertEqual([draft.book_id for draft in drafts], ["RB-001", "RB-002"])
        self.assertTrue(all(draft.content_type == "email_campaign" for draft in drafts))

    def test_unknown_content_type_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            generate_marketing_draft(self.book, "unsupported_channel")

    def test_incomplete_input_is_not_treated_as_validated(self) -> None:
        incomplete_book = dict(self.book)
        del incomplete_book["description"]

        with self.assertRaises(ValueError):
            generate_marketing_draft(incomplete_book)


if __name__ == "__main__":
    unittest.main()
