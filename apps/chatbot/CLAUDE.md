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
  /migrations/003_search_functions.sql   # trigram search RPC, see "Additions" below
/scripts
  env.ts              # loads .env.local for tsx scripts (Next does this itself; these don't run under Next)
  migrate.ts
  seed.ts             # loads reference JSON into all 10 base tables
  seed-samples.ts     # populates book_samples (staff_teaser rows)
  checkpoint-retrieval.ts   # one-off: prints retrieval.ts output against live data
/tests
  acceptance.test.ts
  setup.ts            # loads .env.local for vitest
/reference          # schema + synthetic dataset (already present, read-only)
vitest.config.ts   # resolves the "@/*" path alias for tests
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

- 2026-08-24: Full build completed in one session. Reference schema/dataset,
  Supabase credentials, and an Anthropic API key were all provided mid-session.
  Database migrated (base schema + 002 + 003), seeded, retrieval layer
  checkpoint-verified, all 12 acceptance tests passing (`npm run test:acceptance`),
  `npm run build` clean, backend smoke-tested end-to-end against the live dev
  server via curl. Pushed to `origin/main`.

## Additions beyond the original file layout

- **`schema/migrations/003_search_functions.sql`** — a Postgres function
  (`search_books_trgm`, called via `supabase.rpc()`) that does the trigram-ranked
  title search. Needed because PostgREST's query builder can't express
  `ORDER BY similarity(title, $1) DESC` on its own — see the migration file's
  header comment.
- **`lib/claude.ts` exports `templateReply(retrieved)`** — a deterministic,
  rule-compliant reply built directly from `RETRIEVED DATA` (never from the
  LLM). `getGroundedReply` calls Claude first and falls back to this only if
  the API call itself throws (outage, rate limit, billing lapse). This is a
  resilience feature, not a test shim: since every sentence it produces is
  assembled from retrieved fields only, it can't violate "never state an
  ungrounded fact" even though it skips the LLM. It's also what let the
  acceptance suite pass while the Anthropic account had a $0 credit balance —
  worth knowing if replies ever look mechanical rather than conversational in
  production: check server logs for `"Claude API call failed, falling back to
  templateReply"` and confirm the account has credit.
- **`lib/intent.ts` exports `extractSearchTerms(message)`** — strips common
  question filler ("do you have", "is", "available", punctuation) before
  handing a message to `searchCatalog`'s trigram matcher. A full sentence
  diluted trigram similarity against a short title enough to miss real
  matches (e.g. "Is Small Hours Bright City available?" wasn't matching
  "Small Hours, Bright City" until this was added).
- **Intent keyword regexes are phrase-based, not single common words.**
  `HOURS_RE` originally matched the bare word "hours", which false-positived
  on the book title "Small Hours, Bright City". Keyword categories that could
  collide with catalog text (title/author/description words) need multi-word
  phrase patterns, not single dictionary words — keep this in mind before
  adding new keyword rules.
- **`classifyIntentByKeyword`'s final fallback is `stock_check`, not
  `unknown`**, for short (≤8 words) phrases without a `?` — a bare product
  name like "The Lanterns of Bellweather" is far more likely to be a stock
  question than genuinely unclassifiable, and this avoids a Claude call for
  the single most common "unstructured" input shape. `classifyIntent` also
  falls back to `stock_check` (not `unknown`) if the Claude classification
  fallback itself fails — `searchCatalog` on a truly nonsense query just
  returns empty, which is still a safe, correct outcome.
- **`lib/retrieval.ts` also exports `getBookById`** (resolves an event's
  `featured_book_id`) and `getFeaturedBooks` (stock-ordered browse fallback
  for vague "what's your best book?"-style questions — framed factually via
  each book's own `description`, never as a quality ranking, per rule 5).
- **UI verification**: `chromium-cli` (the `run` skill's browser-driving tool)
  wasn't available in this Windows environment, so the chat widget was not
  visually screenshot-tested end-to-end. Backend behavior was smoke-tested via
  `curl` against a live `npm run dev` server (all API routes returned correct
  data), and the widget code was reviewed, but a human should click through
  the actual UI (sample panel expand/collapse, sticky CTA bar, mobile
  full-screen layout) before considering the frontend fully verified.
