# Data fixtures

These fixtures are deliberately small and focused on Product D marketing behavior.

- `books.marketing-edge-cases.json` is expected to validate against `../books.schema.json`. It covers a null promotional tag, out-of-stock availability, and rating boundaries.
- `books.mixed.json` contains valid and invalid records in a known order for end-to-end orchestration tests.
- `books.invalid.json` contains records that should be rejected by `../book.schema.json`; each entry includes a `case` label and a `record` payload for future validation tests.

The fixtures do not model orders, customers, payments, forecasting, or inventory operations.
