# Data

This directory contains local development data for Product D.

- `book.schema.json` defines the shared contract for one book record.
- `books.schema.json` defines the collection contract and validates arrays such as the sample dataset.
- `books.sample.json` provides representative records for development and future tests.
- `fixtures/books.marketing-edge-cases.json` contains valid records that exercise marketing-relevant boundary conditions.
- `fixtures/books.invalid.json` contains intentionally invalid records for future validation tests.

Production or customer-provided data should not be committed here. The Product D contract contains exactly the nine fields documented in `docs/product-scope.md`; `promotional_tag` remains a nullable single string.

## Contract semantics

- `price` is a non-negative USD retail price with no more than two decimal places. Currency conversion and commerce behavior are outside Product D.
- `rating` is an inclusive numeric average from `0.0` through `5.0`. A missing rating is invalid at the contract boundary rather than something the generator should invent.
- `stock_status` must be `in_stock`, `low_stock`, or `out_of_stock`. Product D may use this value to avoid unsupported availability claims, but it does not manage inventory.
- All nine fields are required. `promotional_tag` expresses the no-tag case explicitly with `null`.
