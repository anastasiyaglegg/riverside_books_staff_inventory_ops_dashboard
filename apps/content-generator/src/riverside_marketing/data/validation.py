"""Load and validate Product D book catalog data.

This module intentionally contains no content-generation behavior. It provides a
small, dependency-free validator for the JSON Schema keywords used by the
checked-in Product D book contract, plus collection loading that quarantines
invalid records from valid ones.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Mapping


DEFAULT_BOOK_SCHEMA_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "book.schema.json"
)


class DataContractError(RuntimeError):
    """Raised when the Product D contract cannot be loaded."""


class DataLoadError(ValueError):
    """Raised when a source file is not a JSON book collection."""


@dataclass(frozen=True)
class ValidationIssue:
    """One actionable contract-validation issue."""

    path: str
    message: str

    def __str__(self) -> str:
        return f"{self.path}: {self.message}"


@dataclass(frozen=True)
class ValidationResult:
    """Validation result for one incoming record.

    Invalid records are returned as ``None`` so callers cannot accidentally
    pass unvalidated data into a later pipeline stage.
    """

    record: dict[str, Any] | None
    errors: tuple[ValidationIssue, ...] = ()

    @property
    def valid(self) -> bool:
        return not self.errors


@dataclass(frozen=True)
class InvalidBookRecord:
    """A rejected collection entry retained for diagnostics or review."""

    index: int
    record: Any
    errors: tuple[ValidationIssue, ...]


@dataclass(frozen=True)
class ValidationReport:
    """Partitioned result of validating a collection of book records."""

    valid_records: tuple[dict[str, Any], ...]
    invalid_records: tuple[InvalidBookRecord, ...]

    @property
    def valid_count(self) -> int:
        return len(self.valid_records)

    @property
    def invalid_count(self) -> int:
        return len(self.invalid_records)

    @property
    def total_count(self) -> int:
        return self.valid_count + self.invalid_count

    @property
    def all_valid(self) -> bool:
        return self.invalid_count == 0


class BookDataValidator:
    """Validate Product D book records against the checked-in JSON contract."""

    def __init__(self, schema_path: str | Path = DEFAULT_BOOK_SCHEMA_PATH) -> None:
        self.schema_path = Path(schema_path)
        self.schema = _load_schema(self.schema_path)

    def validate_record(self, record: Any) -> ValidationResult:
        """Validate one record without raising for ordinary data errors."""

        errors = tuple(_validate_value(record, self.schema, "$"))
        if errors:
            return ValidationResult(record=None, errors=errors)

        # The schema's root type is object, so this cast is safe after
        # validation and prevents callers from mutating the input mapping.
        return ValidationResult(record=dict(record), errors=())

    def validate_collection(self, records: Any) -> ValidationReport:
        """Validate a JSON array and quarantine invalid entries individually."""

        if not isinstance(records, list):
            raise DataLoadError("Expected a JSON array of book records")

        valid_records: list[dict[str, Any]] = []
        invalid_records: list[InvalidBookRecord] = []

        for index, record in enumerate(records):
            result = self.validate_record(record)
            if result.valid:
                # ``record`` is non-None whenever ``result.valid`` is true.
                valid_records.append(result.record)  # type: ignore[arg-type]
            else:
                invalid_records.append(
                    InvalidBookRecord(
                        index=index,
                        record=record,
                        errors=result.errors,
                    )
                )

        return ValidationReport(
            valid_records=tuple(valid_records),
            invalid_records=tuple(invalid_records),
        )

    def load_and_validate(self, path: str | Path) -> ValidationReport:
        """Load a collection file and return its partitioned validation report."""

        source_path = Path(path)
        try:
            payload = json.loads(source_path.read_text(encoding="utf-8"))
        except FileNotFoundError as exc:
            raise DataLoadError(f"Book data file does not exist: {source_path}") from exc
        except OSError as exc:
            raise DataLoadError(f"Could not read book data file: {source_path}") from exc
        except json.JSONDecodeError as exc:
            raise DataLoadError(
                f"Book data file is not valid JSON: {source_path}"
            ) from exc

        return self.validate_collection(payload)


def validate_book_record(
    record: Any,
    schema_path: str | Path = DEFAULT_BOOK_SCHEMA_PATH,
) -> ValidationResult:
    """Convenience wrapper for validating one book record."""

    return BookDataValidator(schema_path).validate_record(record)


def load_and_validate_books(
    path: str | Path,
    schema_path: str | Path = DEFAULT_BOOK_SCHEMA_PATH,
) -> ValidationReport:
    """Convenience wrapper for loading and validating a book collection."""

    return BookDataValidator(schema_path).load_and_validate(path)


def _load_schema(path: Path) -> dict[str, Any]:
    try:
        schema = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise DataContractError(f"Book schema does not exist: {path}") from exc
    except OSError as exc:
        raise DataContractError(f"Could not read book schema: {path}") from exc
    except json.JSONDecodeError as exc:
        raise DataContractError(f"Book schema is not valid JSON: {path}") from exc

    if not isinstance(schema, dict):
        raise DataContractError("Book schema must be a JSON object")
    return schema


def _validate_value(value: Any, schema: Mapping[str, Any], path: str) -> list[ValidationIssue]:
    """Validate the subset of JSON Schema used by the Product D contract."""

    if "$ref" in schema:
        return [
            ValidationIssue(
                path=path,
                message="unresolved schema reference",
            )
        ]

    if "oneOf" in schema:
        matching_branches = sum(
            not _validate_value(value, branch, path)
            for branch in schema["oneOf"]
        )
        if matching_branches != 1:
            return [
                ValidationIssue(
                    path=path,
                    message="must match exactly one allowed value shape",
                )
            ]
        return []

    expected_type = schema.get("type")
    if expected_type is not None and not _matches_type(value, expected_type):
        return [
            ValidationIssue(
                path=path,
                message=f"expected type {expected_type!r}, got {_type_name(value)}",
            )
        ]

    errors: list[ValidationIssue] = []

    if "enum" in schema and value not in schema["enum"]:
        errors.append(
            ValidationIssue(
                path=path,
                message=f"must be one of {schema['enum']!r}",
            )
        )

    if isinstance(value, Mapping):
        properties = schema.get("properties", {})
        required = schema.get("required", [])

        for field_name in required:
            if field_name not in value:
                errors.append(
                    ValidationIssue(
                        path=path,
                        message=f"missing required field {field_name!r}",
                    )
                )

        if schema.get("additionalProperties") is False:
            unexpected = sorted(set(value) - set(properties))
            for field_name in unexpected:
                errors.append(
                    ValidationIssue(
                        path=f"{path}.{field_name}",
                        message="additional field is not allowed",
                    )
                )

        for field_name, field_schema in properties.items():
            if field_name in value:
                errors.extend(
                    _validate_value(
                        value[field_name],
                        field_schema,
                        f"{path}.{field_name}",
                    )
                )

    if isinstance(value, list) and "items" in schema:
        for index, item in enumerate(value):
            errors.extend(
                _validate_value(item, schema["items"], f"{path}[{index}]")
            )

    if isinstance(value, str) and "minLength" in schema:
        if len(value) < schema["minLength"]:
            errors.append(
                ValidationIssue(
                    path=path,
                    message=f"must contain at least {schema['minLength']} character",
                )
            )

    if _is_number(value):
        if not math.isfinite(float(value)):
            errors.append(
                ValidationIssue(path=path, message="must be a finite number")
            )
        else:
            if "minimum" in schema and value < schema["minimum"]:
                errors.append(
                    ValidationIssue(
                        path=path,
                        message=f"must be greater than or equal to {schema['minimum']}",
                    )
                )
            if "maximum" in schema and value > schema["maximum"]:
                errors.append(
                    ValidationIssue(
                        path=path,
                        message=f"must be less than or equal to {schema['maximum']}",
                    )
                )
            if "multipleOf" in schema and not _is_multiple_of(
                value, schema["multipleOf"]
            ):
                errors.append(
                    ValidationIssue(
                        path=path,
                        message=f"must be a multiple of {schema['multipleOf']}",
                    )
                )

    return errors


def _matches_type(value: Any, expected_type: str | list[str]) -> bool:
    if isinstance(expected_type, list):
        return any(_matches_type(value, type_name) for type_name in expected_type)
    if expected_type == "object":
        return isinstance(value, Mapping)
    if expected_type == "array":
        return isinstance(value, list)
    if expected_type == "string":
        return isinstance(value, str)
    if expected_type == "number":
        return _is_number(value)
    if expected_type == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected_type == "boolean":
        return isinstance(value, bool)
    if expected_type == "null":
        return value is None
    return False


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float, Decimal)) and not isinstance(value, bool)


def _is_multiple_of(value: Any, divisor: Any) -> bool:
    try:
        quotient = Decimal(str(value)) / Decimal(str(divisor))
    except (InvalidOperation, ZeroDivisionError):
        return False
    return quotient == quotient.to_integral_value()


def _type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, Mapping):
        return "object"
    if isinstance(value, list):
        return "array"
    if _is_number(value):
        return "number"
    return type(value).__name__
