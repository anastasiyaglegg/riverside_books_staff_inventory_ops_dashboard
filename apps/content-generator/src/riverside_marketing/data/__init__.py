"""Data loading and validation boundary for Product D."""

from .validation import (
    BookDataValidator,
    DataContractError,
    DataLoadError,
    InvalidBookRecord,
    ValidationIssue,
    ValidationReport,
    ValidationResult,
    load_and_validate_books,
    validate_book_record,
)

__all__ = [
    "BookDataValidator",
    "DataContractError",
    "DataLoadError",
    "InvalidBookRecord",
    "ValidationIssue",
    "ValidationReport",
    "ValidationResult",
    "load_and_validate_books",
    "validate_book_record",
]
