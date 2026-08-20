# Technical Spec Sheet — Riverside Books Product Suite
### For spec-driven development

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-20 |
| **Companion doc** | `01-PRD-Riverside-Books-Product-Suite.md` |

This document is the source of truth for **how** the suite is built, so each teammate can build their product against a stable, agreed contract instead of guessing. Anything not explicit here should be raised and added before being assumed.

---

## 1. Tech Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Backend / API | Next.js (App Router or API routes), TypeScript | Single shared backend for all 4 products |
| Database | PostgreSQL via Supabase (free tier) | One shared instance, one schema |
| DB access | Prisma ORM (recommended) or Supabase JS client | Pick one and standardize — do not mix per-product |
| Product A frontend | React + TypeScript (Vite) | Public customer app |
| Product B frontend | React + TypeScript | Internal staff dashboard, auth-gated |
| Product C frontend | React + TypeScript | Chat widget/app |
| Product D frontend | React + TypeScript | Internal content tool, auth-gated |
| Auth | Supabase Auth | Email/phone magic-link for customers (A); email/password for staff (B, D) |
| LLM provider | TBD (e.g., Anthropic API) | Used by Product C (chat) and Product D (content generation) |
| Hosting (frontends + backend) | Vercel (free tier) | Separate Vercel projects per app, or one monorepo with multiple deployments |
| Hosting (DB) | Supabase (free tier) | Includes Postgres + Auth + optional Storage |
| Version control | Git monorepo (recommended) | Shared `packages/` for types/schema, `apps/` per product |

## 2. Repository Structure (Recommended)

```
riverside-books/
├── apps/
│   ├── backend/              # Next.js API — shared for all products
│   ├── customer-app/         # Product A
│   ├── staff-dashboard/      # Product B
│   ├── chatbot/              # Product C
│   └── content-generator/    # Product D
├── packages/
│   ├── shared-types/         # TypeScript types generated/shared from DB schema
│   └── api-client/           # Thin typed fetch wrapper for calling backend from any frontend
├── prisma/
│   └── schema.prisma         # Single source of truth for DB schema
└── docs/
    ├── 01-PRD-...md
    ├── 02-Technical-Spec-Sheet.md
    └── user-stories/
```

Each teammate works primarily in their `apps/<product>` folder plus `packages/shared-types` and `apps/backend` when they need a new endpoint. **No product talks to Postgres directly** — everything routes through `apps/backend`.

## 3. Environments

| Environment | Purpose | Notes |
|---|---|---|
| `local` | Dev machine | Local `.env`, can point at a Supabase dev project or local Postgres |
| `preview` | Vercel preview deployments per PR | Auto-created by Vercel on push; point at a shared Supabase dev/staging project |
| `production` | Live store site | Vercel production deployment; Supabase production project |

> Free-tier note: Supabase free tier supports **one active project** comfortably for cost; consider a single Supabase project with clearly separated data (or a second free project for staging) rather than assuming unlimited environments.

## 4. Database Schema (Shared)

All tables live in one Postgres schema. Field lists below are the MVP contract — extend via migration, don't silently rename/drop.

### `books`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| title | text | |
| author | text | |
| isbn | text | unique, nullable |
| price_cents | integer | store money as integer cents |
| category | text | |
| description | text | nullable |
| image_url | text | nullable |
| created_at / updated_at | timestamptz | |

### `inventory`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| book_id | uuid, FK → books.id | |
| quantity_on_hand | integer | |
| reorder_threshold | integer | default e.g. 2 |
| status | enum: `in_stock`, `low_stock`, `out_of_stock`, `special_order` | derived or maintained on write |
| updated_at | timestamptz | |

### `customers`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | maps to Supabase Auth user id where applicable |
| name | text | |
| email | text | unique, nullable |
| phone | text | unique, nullable |
| loyalty_stamp_count | integer | default 0 |
| created_at | timestamptz | |

### `orders`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| customer_id | uuid, FK → customers.id | |
| status | enum: `placed`, `ready_for_pickup`, `completed`, `cancelled` | |
| payment_status | enum: `unpaid`, `paid_online`, `pay_in_store` | |
| total_cents | integer | |
| created_at / updated_at | timestamptz | |

### `order_items`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK → orders.id | |
| book_id | uuid, FK → books.id | |
| quantity | integer | |
| unit_price_cents | integer | snapshot at order time |

### `events`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| title | text | |
| description | text | |
| event_date | timestamptz | |
| capacity | integer | nullable = unlimited |
| created_at | timestamptz | |

### `event_tickets`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| event_id | uuid, FK → events.id | |
| customer_id | uuid, FK → customers.id | |
| status | enum: `reserved`, `attended`, `cancelled` | |

### `loyalty_transactions`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| customer_id | uuid, FK → customers.id | |
| type | enum: `earn`, `redeem` | |
| related_order_id | uuid, nullable FK → orders.id | |
| created_at | timestamptz | |

### `store_policies`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| key | text | e.g. `hours`, `return_policy` |
| value | text | plain text/markdown, source of truth for chatbot |
| updated_at | timestamptz | |

### `chat_logs`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| customer_identifier | text | nullable, anonymized/session-based if no login |
| messages | jsonb | array of {role, content, timestamp} |
| created_at | timestamptz | |

### `marketing_content`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| subject_type | enum: `book`, `event` | |
| subject_id | uuid | FK to books.id or events.id depending on subject_type |
| caption | text | |
| post_idea | text | |
| tone | text | e.g. `warm_bookish`, `quick_promo`, `event_hype` |
| status | enum: `draft`, `used`, `discarded` | |
| created_by | uuid, FK → staff_users.id | |
| created_at | timestamptz | |

### `staff_users`
| Field | Type | Notes |
|---|---|---|
| id | uuid, PK | maps to Supabase Auth user id |
| name | text | |
| role | enum: `owner`, `bookseller` | |

## 5. API Contract (Backend — Next.js)

Base path: `/api/v1`. All request/response bodies are JSON. All money values are integer cents. All timestamps are ISO 8601 UTC.

### Books & Inventory
| Method | Route | Used by | Description |
|---|---|---|---|
| GET | `/books` | A, C | Search/list catalog (`?q=`, `?category=`) with live stock status joined in |
| GET | `/books/:id` | A, B, C, D | Single title detail incl. stock status |
| POST | `/books` | B | Create title (staff auth required) |
| PATCH | `/books/:id` | B | Edit title (staff auth required) |
| GET | `/inventory` | B | Full inventory view, filterable by status |
| PATCH | `/inventory/:bookId` | B | Adjust quantity_on_hand (staff auth required) |

### Orders (Pre-orders)
| Method | Route | Used by | Description |
|---|---|---|---|
| POST | `/orders` | A | Create a pre-order (customer identity via email/phone) |
| GET | `/orders` | B | List orders, filterable by status |
| GET | `/orders/:id` | A, B | Order detail/status |
| PATCH | `/orders/:id/status` | B | Update status (staff auth required) |

### Customers & Loyalty
| Method | Route | Used by | Description |
|---|---|---|---|
| GET | `/customers/:id` | A, B | Profile incl. loyalty_stamp_count |
| POST | `/customers` | A | Create customer profile |
| POST | `/loyalty/earn` | B | Add a stamp (in-store purchase, staff auth) |
| POST | `/loyalty/redeem` | B | Redeem a reward (staff auth) |

### Events
| Method | Route | Used by | Description |
|---|---|---|---|
| GET | `/events` | A, C | Upcoming events |
| POST | `/events` | B | Create event (staff auth) |
| PATCH | `/events/:id` | B | Edit event (staff auth) |
| POST | `/events/:id/tickets` | A | Reserve a ticket |

### Store Policies / FAQ
| Method | Route | Used by | Description |
|---|---|---|---|
| GET | `/policies` | C | All store policies (hours, returns, etc.) |
| PATCH | `/policies/:key` | B | Edit a policy value (staff auth) |

### Chatbot
| Method | Route | Used by | Description |
|---|---|---|---|
| POST | `/chat` | C | Send a message; backend assembles context (live stock/policies/events) + calls LLM; logs to `chat_logs` |

### Marketing Content
| Method | Route | Used by | Description |
|---|---|---|---|
| POST | `/content/generate` | D | Generate caption + post idea for a book or event (staff auth); calls LLM, stores draft in `marketing_content` |
| GET | `/content` | D | History of generated content, filterable by subject |
| PATCH | `/content/:id/status` | D | Mark as used/discarded |

## 6. Auth & Roles

| Role | Applies to | Auth method | Access |
|---|---|---|---|
| Anonymous customer | Product A, C | None required to browse | Read catalog, stock, events, policies; chat |
| Identified customer | Product A | Email/phone (Supabase magic link or OTP) | Place pre-orders, view own orders/loyalty |
| Staff (bookseller) | Product B, D | Email/password (Supabase Auth) | Full inventory/order/content CRUD |
| Staff (owner) | Product B, D | Email/password (Supabase Auth) | Same as bookseller + policy edits, reporting |

All staff-only routes must verify a valid Supabase session server-side in the Next.js API route — never trust a client-sent role.

## 7. Environment Variables (Backend)

```
DATABASE_URL=              # Supabase Postgres connection string (pooled)
DIRECT_URL=                # Supabase direct connection (for Prisma migrations)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # backend only, never exposed to frontend
LLM_API_KEY=                # provider key for Products C & D
LLM_API_BASE_URL=           # if applicable
```

Each frontend app needs only the **public** Supabase URL/anon key and the backend API base URL — never the service role key or LLM key.

## 8. Deployment Spec

- **Vercel:** One Vercel project per app (`backend`, `customer-app`, `staff-dashboard`, `chatbot`, `content-generator`), all pointing at the same GitHub monorepo with a configured "root directory" per project. Free tier constraints to design around:
  - Serverless function execution time limit (free tier: ~10s) — LLM calls in `/chat` and `/content/generate` must stream or return quickly; avoid long synchronous chains.
  - No persistent server — every backend request is stateless; don't rely on in-memory caching across requests.
- **Supabase:** One project (free tier) hosting Postgres + Auth. Constraints to design around:
  - Free tier storage cap (500MB) and row limits are generous for a single bookstore's catalog/orders, but avoid storing large blobs (e.g., images) in the DB — use Supabase Storage or external image URLs instead.
  - Connection pooling: use Supabase's pooled connection string (`DATABASE_URL`, port 6543) from serverless functions to avoid exhausting Postgres connections; use the direct connection only for migrations.
- **CI/CD:** Vercel auto-deploys previews on PRs and production on merge to `main`. Prisma migrations run as a manual/CI step against Supabase before deploying backend changes that depend on them (schema changes are not auto-applied on deploy).

## 9. Coding Standards

- TypeScript strict mode on for all apps.
- Shared types (DB row shapes, API request/response types) live in `packages/shared-types` and are imported, not redefined per app.
- API responses always return `{ data, error }` shape for consistency across all four frontends.
- Money always in integer cents in code and DB; only formatted to currency at render time.
- Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) to keep a shared history readable across 4 contributors.
- Any schema change (`prisma/schema.prisma`) requires a PR reviewed by at least one other teammate, since all four products depend on it.

## 10. Testing Strategy

| Level | Tooling (suggested) | Scope |
|---|---|---|
| Unit | Vitest/Jest | Business logic (stock status derivation, loyalty math) |
| API | Supertest or equivalent against Next.js API routes | Each endpoint in section 5 |
| Component | React Testing Library | Key UI flows per product |
| Integration/E2E (light) | Playwright (optional, time-permitting) | Cross-product smoke test: stock update in B reflects in A and C |

Given four separate builders on one schema, prioritize **API contract tests** over exhaustive UI tests — that's the seam most likely to break.

## 11. Open Decisions (must be resolved before/at Phase 0)

- [ ] LLM provider for Products C & D (affects `LLM_API_KEY`/base URL and cost planning).
- [ ] Prisma vs. raw Supabase client for DB access (recommend Prisma for shared type safety).
- [ ] Online payment for Product A pre-orders in MVP, or "pay in store" only for v1.
- [ ] Single Supabase project for both staging and production, or two free projects.
