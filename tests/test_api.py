import json
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from fastapi.testclient import TestClient  # noqa: E402

from riverside_marketing.api import app  # noqa: E402


DATA_DIR = PROJECT_ROOT / "data"
MIXED_PATH = DATA_DIR / "fixtures" / "books.mixed.json"
SAMPLE_PATH = DATA_DIR / "books.sample.json"
INVALID_PATH = DATA_DIR / "fixtures" / "books.invalid.json"


def _load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


class ProductDAPIv01Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "service": "riverside-marketing"},
        )

    def test_all_valid_catalog(self) -> None:
        response = self.client.post("/generate", json=_load_json(SAMPLE_PATH))

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["summary"]["total_records"], 2)
        self.assertEqual(result["summary"]["valid_records"], 2)
        self.assertEqual(result["summary"]["rejected_records"], 0)
        self.assertEqual(
            [draft["book_id"] for draft in result["generated_drafts"]],
            ["RB-001", "RB-002"],
        )

    def test_mixed_valid_invalid_catalog(self) -> None:
        response = self.client.post("/generate", json=_load_json(MIXED_PATH))

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["summary"], {
            "total_records": 4,
            "valid_records": 2,
            "rejected_records": 2,
            "generated_drafts": 2,
        })
        self.assertEqual(
            [draft["book_id"] for draft in result["generated_drafts"]],
            ["RB-001", "RB-002"],
        )
        self.assertEqual(
            [record["index"] for record in result["rejected_records"]],
            [1, 3],
        )
        self.assertEqual(
            [diagnostic["index"] for diagnostic in result["validation_diagnostics"]],
            [0, 1, 2, 3],
        )

    def test_all_invalid_catalog_is_a_successful_workflow_result(self) -> None:
        invalid_records = [case["record"] for case in _load_json(INVALID_PATH)]

        response = self.client.post("/generate", json=invalid_records)

        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["generated_drafts"], [])
        self.assertEqual(result["summary"]["valid_records"], 0)
        self.assertEqual(result["summary"]["rejected_records"], 4)
        self.assertEqual(len(result["validation_diagnostics"]), 4)

    def test_malformed_request_body_is_a_client_error_without_traceback(self) -> None:
        response = self.client.post(
            "/generate",
            content=b"{not valid json",
            headers={"content-type": "application/json"},
        )

        self.assertEqual(response.status_code, 422)
        self.assertNotIn("Traceback", response.text)

    def test_incorrect_top_level_shape_is_a_client_error(self) -> None:
        response = self.client.post("/generate", json={"records": []})

        self.assertEqual(response.status_code, 422)
        self.assertNotIn("Traceback", response.text)

    def test_repeated_requests_are_deterministic(self) -> None:
        payload = _load_json(MIXED_PATH)

        first = self.client.post("/generate", json=payload)
        second = self.client.post("/generate", json=payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.content, second.content)


if __name__ == "__main__":
    unittest.main()
