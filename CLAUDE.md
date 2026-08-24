# CLAUDE.md — Riverside Books Customer Support Chatbot (Product C)

This file is the source of truth for future sessions. Read it before re-deriving
anything about stack, behavior rules, or file layout.

## What this is

A retrieval-first customer support chatbot for Riverside Books & Gifts. It answers
customer questions using ONLY live rows from the store's Supabase/Postgres database,
and turns single-book stock questions into pickup reservations via an inline sample
preview flow that hands off to Product A.

It is Product C of a four-product suite (A: ordering/loyalty, B: staff ops dashboard,
C: this chatbot, D: marketing generator). Product C never writes to `orders` — it only
deep-links to Product A.

## Locked tech stack — do not substitute

| Layer | Choice |
|---|---|
| Database | Supabase (PostgreSQL) — `riverside_books_schema_no_stripe.sql` (10 base tables) |
| Backend | Next.js 14+ App Router, API routes under `/app/api/` |
| Frontend | React chat widget, embeddable on the storefront |
| Auth | Firebase Authentication — anonymous-allowed, identity optional |
| LLM | Claude API, model `claude-sonnet-4-6`, server-side only |
| Hosting | Vercel |
| Payments | None — Product C hands off to Product A for reservations |

Two stack notes carried over from the spec:
- The schema (Postgres) is the source of truth, not Square/Gemini/n8n mentioned in
  older narrative docs. If Square is ever added it syncs into `books.stock_level`;
  nothing in Product C changes.
- pgvector is a **stretch item only** (see "Stretch" below). Primary retrieval is
  structured SQL, not vector search — the knowledge base (8 `store_info` rows + a
  small catalog) doesn't need it, and structured retrieval is more accurate, cheaper,
  and faster to ship.

## Non-negotiable behavior rules

These live in the Claude system prompt (`lib/claude.ts`) AND are enforced in code
(`lib/validate.ts`). Both layers matter — the system prompt reduces bad output, the
validator catches what slips through.

1. Never state stock, price, hours, policy, or event details that did not come from a
   database row retrieved *in this request*. Empty retrieval → say so, offer handoff.
2. Never generate book excerpt text. Sample previews render stored, licensed content
   only (`book_samples` table). No sample row → say a preview isn't available and show
   `books.description` instead.
3. Never invent a title, author, ISBN, or availability. No "I believe we carry…".
   Either a row matched or it didn't.
4. Stock is expressed by band, always with a caveat:
   - `stock_level >= 5` → "In stock"
   - `stock_level` 1–4 → "Low stock — N listed" (+ "inventory changes quickly, the shop
     can confirm")
   - `stock_level = 0` → "Out of stock — we can request it for you"
5. No performance/quality claims (bestseller, award-winning, critically acclaimed)
   unless that exact wording is present in `books.description`.
6. No PII in prompts to Claude. Never send customer rows, emails, phone numbers,
   `firebase_uid`, `total_spent`, or order history to the Claude API. Chat identity
   stays server-side; `retrieval.ts` never queries `customers`/`orders`/
   `inventory_history`.
7. Every answer about a purchasable item ends with a concrete next step: read a
   sample, reserve for pickup, or ask a bookseller.

## Decisions made autonomously (not specified in the brief)

- **Package manager**: npm.
- **Test runner**: Vitest (`npm run test:acceptance`), fast + native TS/ESM, good fit
  for Node-side acceptance tests that hit a live Supabase instance.
- **Migrations**: `schema/migrations/*.sql` are plain SQL files. `scripts/migrate.ts`
  applies them via a direct Postgres connection (`pg`, using `DATABASE_URL`) if that
  env var is set; otherwise it prints the SQL and instructions to paste into the
  Supabase SQL Editor by hand. Rationale: the service-role key + REST API (PostgREST)
  cannot run arbitrary DDL like `CREATE TABLE` — only a direct Postgres connection or
  the dashboard SQL Editor can.
- **Rate limiting** (`/api/chat`, 20 req/min per session, 200/day per IP):
  - Per-session limit is enforced with a DB query against `chat_logs` (count rows for
    `session_id` in the last 60s) — correct even across serverless instances.
  - Per-IP daily limit is best-effort in-memory (a `Map` in the route module). This
    resets per cold start and does NOT coordinate across concurrent Vercel serverless
    instances. Documented limitation, acceptable for a free-tier MVP. A durable version
    would need a shared store (e.g. Upstash Redis) — out of scope for the locked stack.
- **Product A URL**: no real reservation URL exists yet. `NEXT_PUBLIC_PRODUCT_A_URL`
  defaults to a placeholder (`https://product-a.riversidebooks.example/reserve`) in
  `.env.example`. Swap for the real URL when Product A ships; nothing else in Product C
  needs to change (see `lib/types.ts` for the deep-link query param builder).
- **Firebase**: wired but non-blocking. `lib/firebase.ts` guards against missing
  `NEXT_PUBLIC_FIREBASE_*` env vars so local/dev/test runs work without a Firebase
  project. Sign-in is optional; anonymous chat is the default path and is what the
  acceptance tests exercise.
- **Styling**: plain CSS (no Tailwind/UI kit) — not part of the locked stack, and the
  widget is small enough not to need one.

## Non-obvious implementation notes

- `lib/retrieval.ts` is the ONLY layer allowed to query `books`, `cards`, `gifts`,
  `store_info`, `events`, `book_samples`. It never touches `customers`, `orders`,
  `inventory_history` — that boundary is what keeps PII out of the Claude prompt.
  If you need new data in a chat answer, add a retrieval function; do not let
  `lib/claude.ts` query Supabase directly.
- `lib/validate.ts` runs on every reply before it reaches the client. It retries the
  Claude call once if the reply contains a price/stock number not present in
  retrieval, strips unsourced quoted passages over 15 words, and falls back to a
  deterministic "can't confirm, call {store_phone}" message on a second failure.
- The sample-preview flow fires whenever retrieval returns exactly one confident book
  match, regardless of the phrasing of the question — it's not a separate intent menu.
  Out-of-stock is the highest-value case (sample + "we can request a copy"), not a
  dead end.
- `sample_preview_events` actions (`shown`, `opened`, `completed`, `reserve_clicked`,
  `dismissed`) are written from the frontend via `POST /api/sample/event` at each step
  of the SamplePanel lifecycle — this is how staff (Product B) measure whether previews
  lead to reservations. Don't write marketing copy claiming conversion numbers; the
  event table is how those numbers get produced, not assumed.
- `chat_logs.was_answered = false` is set on `unknown` intent or empty retrieval. That
  filtered view (`idx_chat_logs_unanswered`) is the staff weekly triage queue — treat
  every false row as a missing `store_info` entry or catalog gap, not noise to hide.

## File layout

```
/CLAUDE.md
/.env.example
/app
  layout.tsx, page.tsx        # demo host page embedding <ChatWidget />
  /api
    /chat/route.ts
    /inventory/route.ts
    /sample/[book_id]/route.ts
    /sample/event/route.ts
    /store-info/route.ts
    /events/route.ts
/lib
  supabase.ts     # server client, service role key, never imported client-side
  retrieval.ts    # typed SQL retrieval functions, Section 4/5 of spec
  intent.ts       # keyword-first intent router, Claude fallback only if ambiguous
  claude.ts       # system prompt + one grounded Claude call per turn
  validate.ts      # post-response checks + deterministic fallback
  types.ts        # shared types + Product A deep-link builder
  firebase.ts     # optional client-side Firebase Auth init
  rate-limit.ts   # session (DB) + IP (in-memory) limiter for /api/chat
/components
  ChatWidget.tsx
  MessageList.tsx
  ProductCard.tsx
  SamplePanel.tsx
  HandoffCard.tsx
/schema
  /migrations/002_product_c_samples.sql
/scripts
  migrate.ts
  seed.ts           # loads reference JSON into all 10 base tables
  seed-samples.ts   # populates book_samples (staff_teaser rows)
/tests
  acceptance.test.ts
/reference          # schema + synthetic dataset (already present, read-only)
```

## Commands

```bash
npm install            # install deps
npm run dev             # Next.js dev server, http://localhost:3000
npm run migrate          # apply schema/migrations/*.sql (needs DATABASE_URL, else prints manual steps)
npm run seed              # load reference dataset into all 10 tables + seed book_samples
npm run test:acceptance    # run tests/acceptance.test.ts against the seeded Supabase project
npm run build            # production build
```

Environment variables: see `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` and
`ANTHROPIC_API_KEY` must never reach the client bundle — only import them in files
under `/lib` and `/app/api`, never in `/components`.

## Stretch (only after all acceptance tests pass)

pgvector on `store_info.value` for FAQ near-misses, used ONLY when `getStoreInfo`
returns nothing and intent is `unknown`. Structured retrieval stays primary.

## Status log

- 2026-08-24: Repo scaffolded (config, CLAUDE.md, migration file, `.gitignore`).
  Blocked on: `reference/riverside_books_schema_no_stripe.sql` and
  `reference/riverside_books_synthetic_dataset__1_.json` (neither existed in the repo
  at session start — user is adding them), Supabase project credentials, and an
  Anthropic API key. Retrieval layer, seed scripts, API routes, and the acceptance
  suite all depend on the actual schema and are not yet written.
