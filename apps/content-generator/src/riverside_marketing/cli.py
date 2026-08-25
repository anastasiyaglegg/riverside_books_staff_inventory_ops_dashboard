"""Command-line entry point for the Product D catalog workflow."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Sequence

from .data import DataContractError, DataLoadError
from .generation import ContentType
from .orchestration import load_and_generate_catalog


def main(argv: Sequence[str] | None = None) -> int:
    """Run the catalog workflow and emit one machine-readable JSON result."""

    parser = argparse.ArgumentParser(
        description="Validate a Riverside Books catalog and generate Product D drafts."
    )
    parser.add_argument(
        "catalog",
        type=Path,
        help="Path to a Riverside Books catalog JSON array",
    )
    parser.add_argument(
        "--content-type",
        choices=[content_type.value for content_type in ContentType],
        default=ContentType.PROMOTIONAL_DESCRIPTION.value,
        help="Marketing draft type to generate (default: promotional_description)",
    )
    args = parser.parse_args(argv)

    try:
        result = load_and_generate_catalog(
            args.catalog,
            content_type=args.content_type,
        )
    except (DataLoadError, DataContractError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    json.dump(result.as_dict(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return 0
