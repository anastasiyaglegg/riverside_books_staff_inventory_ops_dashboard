# Riverside Marketing Content Generator

Riverside Books is an early-stage online bookstore product. This repository is the working home for product discovery, documentation, and implementation as the product takes shape.

## Pursuit scope

The current scope is:

- **Product D — Marketing Content Generator:** the primary product area. It helps Riverside Books create consistent, useful marketing content for books, campaigns, and customer communications.
- **Product C — Customer Support Chatbot:** a supporting product area. It helps customers find answers, discover books, and get assistance during the buying journey.

The scope is intentionally narrow while the product is being validated. Storefront, catalog, checkout, fulfillment, and analytics work can be added later as the product definition matures.

## Repository structure

```text
.
├── docs/
│   ├── product-scope.md
│   └── roadmap.md
└── products/
    ├── customer-support-chatbot/
    │   └── README.md
    └── marketing-content-generator/
        └── README.md
```

The repository is documentation-first until an implementation stack and application boundaries are confirmed.

## Status

Early discovery and repository setup.

## Working principles

- Keep the product useful for an independent bookstore and its customers.
- Prefer small, testable product slices over broad platform work.
- Treat generated content and support answers as reviewable outputs.
- Keep customer data, store information, and credentials out of source control.

## Next steps

1. Define the first customer and bookstore workflows for Product D.
2. Capture the support intents and source-of-truth content needed for Product C.
3. Choose the implementation stack after the initial workflows are validated.
4. Add runnable application code and tests behind the product-area documentation.
