import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from riverside_marketing.cli import main  # noqa: E402


DATA_DIR = PROJECT_ROOT / "data"
MIXED_PATH = DATA_DIR / "fixtures" / "books.mixed.json"
SAMPLE_PATH = DATA_DIR / "books.sample.json"


def _run_cli(*args: str) -> tuple[int, str, str]:
    stdout = io.StringIO()
    stderr = io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        exit_code = main(list(args))
    return exit_code, stdout.getvalue(), stderr.getvalue()


class ProductDCLITests(unittest.TestCase):
    def test_mixed_catalog_succeeds_with_rejections_in_json_output(self) -> None:
        exit_code, stdout, stderr = _run_cli(str(MIXED_PATH))

        self.assertEqual(exit_code, 0)
        self.assertEqual(stderr, "")
        result = json.loads(stdout)
        self.assertEqual(result["summary"]["total_records"], 4)
        self.assertEqual(result["summary"]["valid_records"], 2)
        self.assertEqual(result["summary"]["rejected_records"], 2)
        self.assertEqual(result["summary"]["generated_drafts"], 2)
        self.assertEqual(
            [draft["book_id"] for draft in result["generated_drafts"]],
            ["RB-001", "RB-002"],
        )
        self.assertEqual(
            [record["index"] for record in result["rejected_records"]],
            [1, 3],
        )

    def test_valid_only_catalog_succeeds(self) -> None:
        exit_code, stdout, stderr = _run_cli(str(SAMPLE_PATH))

        self.assertEqual(exit_code, 0)
        self.assertEqual(stderr, "")
        result = json.loads(stdout)
        self.assertEqual(result["summary"]["rejected_records"], 0)
        self.assertEqual(result["summary"]["generated_drafts"], 2)
        self.assertEqual(result["rejected_records"], [])

    def test_missing_catalog_is_a_fatal_stderr_error(self) -> None:
        missing_path = str(DATA_DIR / "does-not-exist.json")

        exit_code, stdout, stderr = _run_cli(missing_path)

        self.assertEqual(exit_code, 1)
        self.assertEqual(stdout, "")
        self.assertIn("error:", stderr)
        self.assertIn("does-not-exist.json", stderr)

    def test_malformed_catalog_is_a_fatal_stderr_error(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            malformed_path = Path(temp_dir) / "malformed.json"
            malformed_path.write_text("{not valid json", encoding="utf-8")

            exit_code, stdout, stderr = _run_cli(str(malformed_path))

        self.assertEqual(exit_code, 1)
        self.assertEqual(stdout, "")
        self.assertIn("error:", stderr)
        self.assertIn("not valid UTF-8 JSON", stderr)

    def test_successful_json_output_is_stable(self) -> None:
        first = _run_cli(str(MIXED_PATH))
        second = _run_cli(str(MIXED_PATH))

        self.assertEqual(first[0], 0)
        self.assertEqual(second[0], 0)
        self.assertEqual(first[1], second[1])
        self.assertEqual(first[2], "")
        json.loads(first[1])


if __name__ == "__main__":
    unittest.main()
