# CLAUDE.md — Riverside Books: Backend + Staff Inventory Dashboard

> Drop this file at the repo root (as `CLAUDE.md`, or your CLI tool's equivalent — e.g. `AGENTS.md`) so it's loaded automatically as standing project context every session. This is not a one-off task prompt — it's the persistent rulebook. Re-read it if you're ever unsure of a convention rather than guessing or inventing a new one.

## Scope of This Repo/Context

This context covers two coupled pieces, built together:

1. **`apps/backend`** — the shared Next.js API. It is the *only* thing allowed to talk to Postgres. Other products in the suite (customer app, chatbot, content generator) will call it later; you are not building those here.
2. **`apps/staff-dashboard`** — the internal, authenticated React dashboard (Product B) used by the store owner and two part-time booksellers to manage inventory, pre-orders, events, policies, and loyalty.

Build in **vertical slices**: schema change → endpoint → dashboard screen → tests, for one feature at a time. Don't build the entire backend before starting the frontend, or vice versa.

## Reference Docs (Read When Ambiguous, Don't Restate From Memory)

| Doc | Use it for |
|---|---|
| `01-PRD-Riverside-Books-Product-Suite.md` | Full product/business context |
| `02-Technical-Spec-Sheet.md` | Complete schema + API contract for the whole suite |
| `04-User-Stories-Product-B-Staff-Dashboard.md` | Per-screen acceptance criteria |
| `nextjs-backend-best-practices/SKILL.md` | Generic Next.js/Prisma patterns |
| `09-Testing-Practices.md` | Full testing requirements |
| `10-Commit-and-Push-Practices.md` | Full commit/push requirements |

If this file and a companion doc disagree, the companion doc wins. If a companion doc is missing from context, ask rather than inventing a convention.

## Tech Stack (Non-Negotiable)

| Layer | Technology |
|---|---|
| Backend | Next.js (App Router), TypeScript, REST under `/api/v1` |
| Database | PostgreSQL via Supabase (free tier) |
| DB access | Prisma ORM |
| Dashboard frontend | React + TypeScript |
| Auth | Supabase Auth (email/password, staff only) |
| Validation | Zod on every write endpoint |
| Hosting | Vercel (free tier), Supabase (free tier) |

Every API response uses the standard envelope: `{ data, error }`. This is load-bearing across the whole suite — never return a bare object or array.

## Database Schema

Source of truth: `prisma/schema.prisma`. Tables relevant to this context:

```prisma
model Book {
  id          String   @id @default(uuid())
  title       String
  author      String
  isbn        String?  @unique
  priceCents  Int
  category    String?
  description String?
  imageUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  inventory   Inventory?
  orderItems  OrderItem[]
}

model Inventory {
  id                String   @id @default(uuid())
  bookId            String   @unique
  book              Book     @relation(fields: [bookId], references: [id])
  quantityOnHand    Int
  reorderThreshold  Int      @default(2)
  status            String   // "in_stock" | "low_stock" | "out_of_stock" — derived, never hand-set
  updatedAt         DateTime @updatedAt
}

model Customer {
  id                 String   @id @default(uuid())
  name               String
  email              String?  @unique
  phone              String?  @unique
  firebaseUid        String?  @unique // Firebase Auth uid (Product A customer sign-in); null for staff/guest-created rows
  loyaltyStampCount  Int      @default(0)
  createdAt          DateTime @default(now())
  orders             Order[]
  loyaltyTx          LoyaltyTransaction[]
}

model Order {
  id             String   @id @default(uuid())
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  status         String   // "placed" | "ready_for_pickup" | "completed" | "cancelled"
  paymentStatus  String   // "unpaid" | "paid_online" | "pay_in_store"
  totalCents     Int
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  items          OrderItem[]
}

model OrderItem {
  id             String @id @default(uuid())
  orderId        String
  order          Order  @relation(fields: [orderId], references: [id])
  bookId         String
  book           Book   @relation(fields: [bookId], references: [id])
  quantity       Int
  unitPriceCents Int
}

model Event {
  id          String   @id @default(uuid())
  title       String
  description String?
  eventDate   DateTime
  capacity    Int?
  createdAt   DateTime @default(now())
}

// Added when POST /events/:id/tickets was built for Product A -- not in the
// original table.
model EventTicket {
  id         String   @id @default(uuid())
  eventId    String
  event      Event    @relation(fields: [eventId], references: [id])
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  status     String   // "reserved" | "attended" | "cancelled"
  createdAt  DateTime @default(now())
}

model LoyaltyTransaction {
  id             String   @id @default(uuid())
  customerId     String
  customer       Customer @relation(fields: [customerId], references: [id])
  type           String   // "earn" | "redeem"
  relatedOrderId String?
  createdAt      DateTime @default(now())
}

model StorePolicy {
  id        String   @id @default(uuid())
  key       String   @unique // e.g. "hours", "return_policy"
  value     String
  updatedAt DateTime @updatedAt
}

model StaffUser {
  id   String @id @default(uuid()) // matches Supabase Auth user id
  name String
  role String // "owner" | "bookseller"
}
```

**Rules:** money is always integer cents. Status/role/type fields are `snake_case` string literals, exactly as commented above — never rename or re-case them; other products in the suite key off these literal values. Any schema change needs a migration, never a hand edit.

## API Endpoints Owned by This Context

All under `/api/v1`. Staff-only routes call `requireStaffSession()` (see the SKILL.md auth pattern) and return `401` via the standard `fail(...)` helper if unauthenticated. Never trust a role/user id from the client body.

This started as a backend+staff-dashboard-only table (Product A's own endpoints were explicitly out of scope). Once Product A started being built against this same shared backend, several of its endpoints got added here too -- see the "Public" rows below, and the note under each on why staff auth was dropped where it originally existed.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/books` | Public | List/search catalog (`?q=`, `?category=`), joined with inventory status |
| GET | `/books/:id` | Public | Single title + stock status |
| POST | `/books` | Staff | Create title + its inventory row |
| PATCH | `/books/:id` | Staff | Edit title fields |
| GET | `/inventory` | Staff | Full inventory view, filterable by `?status=` |
| PATCH | `/inventory/:bookId` | Staff | Adjust `quantityOnHand`; recompute `status` server-side via `deriveStockStatus()` |
| GET | `/orders` | Staff, or Public with `?customerId=` | Without `customerId`: full staff listing, filterable by `?status=`. With `customerId`: that customer's own order history, no staff session needed |
| POST | `/orders` | Public | Create a pre-order (Product A). Body: `{ customerName, customerEmail? or customerPhone?, items: [{ bookId, quantity }] }`. Finds-or-creates the customer by email/phone -- no prior signup required |
| GET | `/orders/:id` | Public | Single order detail. Was staff-only; opened up so Product A can poll its own order without a customer-auth system (none exists yet) -- same "unguessable UUID" pattern as `/books/:id` |
| PATCH | `/orders/:id/status` | Staff | Transition order status; reject invalid transitions |
| GET | `/customers` | Staff | Search customers (`?q=` matches name/email/phone) -- added post-hoc for story B9 (Loyalty Lookup), not in the original table |
| POST | `/customers` | Public | Create a customer profile (Product A signup). `409` on duplicate email/phone |
| GET | `/customers/:id` | Public | Customer profile incl. loyalty count. Was staff-only; same unguessable-UUID reasoning as `/orders/:id` |
| GET | `/customers/me` | Customer (Firebase) | The signed-in customer's own record. Verifies a Firebase ID token (`requireCustomerSession`), links the uid to an existing row (verified email required) or creates one, so loyalty/orders restore on any device. `403 EMAIL_NOT_VERIFIED` on an unverified-email collision |
| POST | `/loyalty/earn` | Staff | Add a stamp; body: `{ customerId }` |
| POST | `/loyalty/redeem` | Staff | Redeem a reward; body: `{ customerId }`; reject if balance insufficient |
| GET | `/events` | Public | Upcoming events |
| POST | `/events` | Staff | Create event |
| PATCH | `/events/:id` | Staff | Edit event |
| POST | `/events/:id/tickets` | Public | Reserve a ticket (Product A). Body: `{ customerName, customerEmail? or customerPhone? }`. Rejects with `400` once `event.capacity` is reached (cancelled tickets don't count against it); finds-or-creates the customer same as `/orders` |
| GET | `/policies` | Public | All store policies |
| PATCH | `/policies/:key` | Staff | Edit a policy value |

**On the public-by-unguessable-UUID pattern** (`/orders/:id`, `/customers/:id`): this is an MVP tradeoff, not a real auth system. The technical spec defers real customer identity to a Supabase magic-link/OTP flow that hasn't been built. Anyone who has (or guesses) the UUID can read that order/customer record. Acceptable for now since these are hard-to-guess v4 UUIDs and the data isn't especially sensitive (no payment info), but revisit if/when real customer auth gets built.

## Shared Business Logic — Build and Unit-Test Before Wiring Routes

```ts
// lib/inventory.ts
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export function deriveStockStatus(quantityOnHand: number, reorderThreshold: number): StockStatus
```

```ts
// lib/orders.ts
export type OrderStatus = "placed" | "ready_for_pickup" | "completed" | "cancelled";
export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean
// Valid: placed -> ready_for_pickup, placed -> cancelled,
//        ready_for_pickup -> completed, ready_for_pickup -> cancelled
// Invalid: any transition out of completed/cancelled, or skipping ready_for_pickup
```

```ts
// lib/loyalty.ts
export const STAMPS_PER_REWARD = 10; // ASSUMPTION — confirm with store owner before relying on this
export function canRedeem(currentStamps: number): boolean
export function applyEarn(currentStamps: number): number
export function applyRedeem(currentStamps: number): number // throws if !canRedeem
```

Route handlers call these functions; they never re-implement the logic inline.

## Dashboard Screens (Product B)

Each maps to endpoint(s) above and to acceptance criteria in `04-User-Stories-Product-B-Staff-Dashboard.md` (stories B1–B13). A screen isn't done until its story's acceptance criteria pass — not just when it renders.

1. **Login** — Supabase Auth email/password; nothing else is reachable unauthenticated.
2. **Inventory view** — table with quantity, status badge, "Needs Reorder" filter, inline quantity adjustment.
3. **Add/Edit Book** — create/edit form.
4. **Pre-Order Queue** — orders with status `placed`/`ready_for_pickup`, oldest first, status-change control, customer contact shown.
5. **Loyalty Lookup** — search customer, view/add stamp, redeem reward.
6. **Events** — list + create/edit form.
7. **Store Policies** — editable fields per policy key.
8. **Weekly Snapshot** (should-have, build last) — pre-orders this week, low-stock count, new loyalty sign-ups.

## Testing Rules (Enforced, Not Optional)

Full detail in `09-Testing-Practices.md`. Minimum bar here:

- Unit test every function in the business-logic section above — all branches.
- Integration test every endpoint — happy path + at least one validation/auth-failure case.
- E2E, minimum two flows: "staff zeroes stock → dashboard shows Out of Stock" and "staff advances a pre-order to Ready for Pickup → status updates."
- Set up pre-commit (lint + typecheck + unit tests) and pre-push (full suite) hooks as your **first** commit in this repo, before any feature work.
- **Never push with a red test suite. Never bypass the hook with `--no-verify` as a habit.**

## Commit & Push Rules (Enforced, Not Optional)

Full detail in `10-Commit-and-Push-Practices.md`. Minimum bar here:

- One coherent subtask per commit. A vertical slice (schema + endpoint + screen + tests) is built together but **committed separately** by concern — e.g. `feat(db): add Inventory model`, then `feat(api): add PATCH /inventory/:bookId`, then `test(api): add integration tests for inventory update`, then `feat(dashboard): add inventory adjustment UI`.
- Conventional Commits format: `type(scope): imperative summary`, no trailing period, under ~72 chars.
- Never commit secrets. `.env.local` is gitignored; keep `.env.example` current.
- Every push requires a green local suite first (the hook enforces this — don't route around it).

## Suggested Build Order

1. Scaffold: Next.js app, TypeScript, Prisma, Husky hooks, test runner. → `chore(backend): scaffold app with Prisma and test tooling`
2. Full schema + initial migration. → `feat(db): add initial schema for books, inventory, orders, events, loyalty`
3. `lib/` business logic (inventory, orders, loyalty), fully unit tested.
4. `lib/api-response.ts`, `lib/prisma.ts`, `lib/auth.ts`.
5. Auth wiring + staff login screen.
6. Vertical slice: Inventory.
7. Vertical slice: Books.
8. Vertical slice: Orders.
9. Vertical slice: Loyalty.
10. Vertical slice: Events.
11. Vertical slice: Policies.
12. E2E tests for the flows above.
13. Weekly Snapshot (time-permitting).

## Definition of Done

- [ ] Every endpoint above implemented, Zod-validated, returning `{ data, error }`.
- [ ] Every screen above meets its user story's acceptance criteria.
- [ ] Full test suite green (unit + integration + E2E).
- [ ] Commit history is one-subtask-per-commit, Conventional Commits format.
- [ ] No secrets committed; `.env.example` present and current.
- [ ] Staff-only routes/screens unreachable without a valid session.

## Handling Ambiguity

For cosmetic/UI decisions not specified here (badge colors, exact copy) — make a reasonable choice, note it in the commit message, keep moving. For anything touching **data integrity, auth, or money** (e.g., "does redeeming reset stamps to zero or subtract 10?") — stop and ask rather than guessing.
