# Testing Practices — Riverside Books Product Suite

Applies to all apps in the monorepo, with backend-specific examples since that's the shared layer everyone depends on. The rule underneath all of this: **if tests aren't green, it doesn't get committed, and it definitely doesn't get pushed.**

---

## 1. The Testing Pyramid (What Goes Where)

```
        ▲
       /E2E\          few, slow, high-confidence — critical user flows only
      /------\
     /Integr. \       moderate — API routes against a real (test) DB
    /----------\
   /   Unit     \     many, fast, cheap — pure logic, no DB, no network
  /--------------\
```

| Layer | Tests | Tooling | Speed | Hits real DB? |
|---|---|---|---|---|
| Unit | Pure functions, business logic (`lib/inventory.ts`, loyalty math, validation schemas) | Vitest | Milliseconds | No |
| Integration | API route handlers, request → response, DB reads/writes | Vitest + Supertest (or Next.js route testing) | Seconds | Yes — test DB |
| E2E | Full user flows across a real running app (e.g., place a pre-order → see it in staff dashboard) | Playwright | Slower (seconds–minutes) | Yes — test DB |

**Rule of thumb:** if you can test it without touching the database or the network, it's a unit test and it should be one. Push logic down into `lib/` (see backend best-practices doc, §7) specifically so it's unit-testable.

## 2. Unit Tests

**Scope:** Business logic and pure functions — stock status derivation, loyalty stamp math, validation schemas, formatting helpers.

**Location:** Colocated with the code, `*.test.ts` next to the file it tests.

```ts
// lib/inventory.test.ts
import { describe, it, expect } from "vitest";
import { deriveStockStatus } from "./inventory";

describe("deriveStockStatus", () => {
  it("returns out_of_stock when quantity is 0", () => {
    expect(deriveStockStatus(0, 2)).toBe("out_of_stock");
  });

  it("returns low_stock when quantity is at threshold", () => {
    expect(deriveStockStatus(2, 2)).toBe("low_stock");
  });

  it("returns in_stock when quantity is above threshold", () => {
    expect(deriveStockStatus(5, 2)).toBe("in_stock");
  });
});
```

**Standard:** every function in `lib/` that contains a decision (an `if`, a calculation, a branch) has at least one test per branch.

## 3. Integration Tests

**Scope:** API routes, end-to-end through the handler — request in, response out, real (test) database in between. This is the layer that protects the API contract in the technical spec sheet, which all four frontends depend on.

**Location:** `app/api/**/*.integration.test.ts`, run against a dedicated test database (never the dev or prod Supabase project).

```ts
// app/api/v1/orders/route.integration.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";

describe("POST /api/v1/orders", () => {
  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
  });

  it("creates an order and returns 200 with the created order", async () => {
    const book = await prisma.book.create({ data: { title: "Test Book", author: "A. Author", priceCents: 1500 } });

    const request = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        items: [{ bookId: book.id, quantity: 1 }],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("placed");
  });

  it("returns 400 when neither email nor phone is provided", async () => {
    const request = new Request("http://localhost/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({ customerName: "Jane Doe", items: [] }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

**Standard:** every endpoint listed in the technical spec sheet's API contract (§5) has at least: one happy-path test, one validation-failure test, and (for staff-only routes) one unauthorized-access test.

## 4. End-to-End (E2E) Tests

**Scope:** Small number of critical, cross-cutting flows that prove the products actually work together — not just individually.

**Location:** `e2e/` at the monorepo root, run with Playwright against a deployed preview or local full stack.

**Minimum required E2E flows for MVP:**
1. Customer places a pre-order in Product A → staff sees it in Product B's queue.
2. Staff adjusts stock to zero in Product B → Product A shows "Out of Stock" → Product C's chatbot says the same when asked.
3. Staff adds a loyalty stamp in Product B → customer sees updated count in Product A.
4. Staff generates content in Product D for a real book → caption references correct title/author.

```ts
// e2e/preorder-to-dashboard.spec.ts
import { test, expect } from "@playwright/test";

test("pre-order placed in customer app appears in staff dashboard queue", async ({ page }) => {
  await page.goto("/"); // customer app
  await page.getByPlaceholder("Search books").fill("Test Book");
  await page.getByText("Test Book").click();
  await page.getByRole("button", { name: "Pre-order" }).click();
  await page.getByLabel("Name").fill("Jane Doe");
  await page.getByLabel("Email").fill("jane@example.com");
  await page.getByRole("button", { name: "Submit pre-order" }).click();
  await expect(page.getByText("Pre-order placed")).toBeVisible();

  // switch context to staff dashboard
  await page.goto(process.env.STAFF_DASHBOARD_URL!);
  await expect(page.getByText("Jane Doe")).toBeVisible();
});
```

**Standard:** E2E tests stay few and focused on cross-product seams (per the "Cross-Product Dependency Notes" in the combined user stories doc). Don't duplicate what unit/integration tests already cover.

## 5. Test Database Setup

- A separate Supabase project (or at minimum a separate schema) is used for automated tests — never point tests at production data.
- Migrations run against the test DB before the suite (`prisma migrate deploy` in CI, or `prisma migrate reset` locally).
- Integration/E2E tests clean up their own data (`beforeEach`/`afterEach`), so the suite is repeatable and order-independent.

## 6. Coverage Expectations (MVP)

| Layer | Target |
|---|---|
| Unit | 80%+ on everything in `lib/` |
| Integration | Every documented API endpoint has at least a happy-path + validation-failure test |
| E2E | The 4 flows listed in §4, minimum |

Coverage percentage is a floor, not a goal — a test that asserts nothing meaningful doesn't count just because it bumped a number.

## 7. Pre-Commit Hook — Fast Checks Only

Runs automatically on `git commit` via Husky + lint-staged. Kept fast (seconds) so it doesn't get skipped out of impatience.

```json
// package.json (root)
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run typecheck
npm run test:unit -- --run
```

**Pre-commit runs:** lint + format on staged files, TypeScript typecheck, unit tests only. Integration/E2E are too slow for every commit.

## 8. Pre-Push Hook — Full Suite, Must Be Green

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run typecheck
npm run test:unit -- --run
npm run test:integration -- --run
npm run test:e2e
```

**Pre-push runs:** everything — unit, integration, and E2E. If any test fails, the push is blocked. No `--no-verify` unless there's an explicit, agreed exception (and even then, fix it in the very next commit).

## 9. CI Gate (GitHub Actions) — the Backstop

Local hooks can be bypassed by accident (or by someone in a hurry); CI is the non-negotiable gate before merge.

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:unit -- --run
      - run: npm run test:integration -- --run
      - run: npm run test:e2e
```

**Rule:** PRs cannot merge to `main` unless this workflow is green. Treat a red CI run the same as a broken build — stop and fix it before starting new work.

## 10. Summary Checklist

- [ ] Every new function with a branch/decision has a unit test.
- [ ] Every new/changed API endpoint has an integration test (happy path + at least one failure case).
- [ ] Cross-product flows are covered by one of the four core E2E tests, or a new one is added if the flow is genuinely new.
- [ ] `npm run test` (full suite) is green locally before pushing.
- [ ] CI is green before requesting review or merging.
