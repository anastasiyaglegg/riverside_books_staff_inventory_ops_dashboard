import json
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from riverside_marketing.data import (  # noqa: E402
    BookDataValidator,
    DataLoadError,
    load_and_validate_books,
    validate_book_record,
)


DATA_DIR = PROJECT_ROOT / "data"
SAMPLE_PATH = DATA_DIR / "books.sample.json"
EDGE_CASE_PATH = DATA_DIR / "fixtures" / "books.marketing-edge-cases.json"
INVALID_PATH = DATA_DIR / "fixtures" / "books.invalid.json"


class BookValidationTests(unittest.TestCase):
    def test_sample_dataset_is_valid(self) -> None:
        report = load_and_validate_books(SAMPLE_PATH)

        self.assertTrue(report.all_valid)
        self.assertEqual(report.valid_count, 2)
        self.assertEqual(report.invalid_count, 0)
        self.assertEqual(report.valid_records[0]["book_id"], "RB-001")

    def test_marketing_edge_cases_are_valid(self) -> None:
        report = load_and_validate_books(EDGE_CASE_PATH)

        self.assertTrue(report.all_valid)
        self.assertEqual(report.valid_count, 4)
        self.assertIsNone(report.valid_records[0]["promotional_tag"])
        self.assertEqual(report.valid_records[1]["stock_status"], "out_of_stock")
        self.assertEqual(report.valid_records[2]["rating"], 0)
        self.assertEqual(report.valid_records[3]["rating"], 5)

    def test_invalid_fixture_records_are_rejected(self) -> None:
        validator = BookDataValidator()
        invalid_cases = json.loads(INVALID_PATH.read_text(encoding="utf-8"))

        self.assertEqual(len(invalid_cases), 4)
        for case in invalid_cases:
            with self.subTest(case=case["case"]):
                result = validator.validate_record(case["record"])
                self.assertFalse(result.valid)
                self.assertIsNone(result.record)
                self.assertGreater(len(result.errors), 0)

    def test_invalid_record_is_quarantined_from_valid_records(self) -> None:
        validator = BookDataValidator()
        valid_record = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))[0]
        invalid_record = json.loads(INVALID_PATH.read_text(encoding="utf-8"))[0]["record"]

        report = validator.validate_collection([valid_record, invalid_record])

        self.assertEqual(report.valid_count, 1)
        self.assertEqual(report.invalid_count, 1)
        self.assertEqual(report.invalid_records[0].index, 1)
        self.assertEqual(report.valid_records[0]["book_id"], "RB-001")

    def test_unknown_fields_are_rejected(self) -> None:
        record = json.loads(SAMPLE_PATH.read_text(encoding="utf-8"))[0]
        record["unsupported_field"] = "should not cross the contract boundary"

        result = validate_book_record(record)

        self.assertFalse(result.valid)
        self.assertTrue(
            any("additional field is not allowed" in issue.message for issue in result.errors)
        )

    def test_malformed_or_non_collection_files_raise_data_load_error(self) -> None:
        validator = BookDataValidator()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / "malformed.json"
            temp_path.write_text("{not valid json", encoding="utf-8")

            with self.assertRaises(DataLoadError):
                validator.load_and_validate(temp_path)

            temp_path.write_text(json.dumps({"book_id": "RB-001"}), encoding="utf-8")
            with self.assertRaises(DataLoadError):
                validator.load_and_validate(temp_path)


if __name__ == "__main__":
    unittest.main()
