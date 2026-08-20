# Riverside Books — Backend

Next.js (App Router) API-only backend. No pages, no UI — just `app/api/v1/**/route.ts`
handlers. See `../../CLAUDE.md` at the repo root for the full contract (schema, endpoints,
business rules).

## Prerequisites

- **Node.js 20+** — `node -v` to check. Install via `brew install node` if missing.
- **PostgreSQL** — a local instance for dev + test databases (this project doesn't require
  a real Supabase account to run locally). Install via `brew install postgresql@16`, then:
  ```
  brew services start postgresql@16
  createdb riverside_dev
  createdb riverside_test
  ```

## First-time setup

Run these from the **repo root** (`riverside_books/`), not from `apps/backend/`:

```
npm install
```

This installs dependencies for all workspaces (currently just `apps/backend`) and sets up
the Husky git hooks.

Then, from `apps/backend/`:

```
cd apps/backend
cp .env.example .env.local
cp .env.test.example .env.test
```

Edit both files — replace `YOUR_LOCAL_USER` / the empty values with your local Postgres
connection strings, e.g.:

```
# .env.local
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/riverside_dev
DIRECT_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/riverside_dev
```

```
# .env.test
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/riverside_test
DIRECT_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/riverside_test
```

(Run `whoami` to get your local Postgres username — Homebrew's default Postgres role
matches your macOS username.)

Generate the Prisma client and apply migrations to both databases:

```
npx prisma generate
DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d= -f2) \
DIRECT_URL=$(grep DIRECT_URL .env.local | cut -d= -f2) \
npx prisma migrate deploy

DATABASE_URL=$(grep DATABASE_URL .env.test | cut -d= -f2) \
DIRECT_URL=$(grep DIRECT_URL .env.test | cut -d= -f2) \
npx prisma migrate deploy
```

Optionally, seed realistic sample data (~211 books/inventory across every genre and
stock state, 50 customers with loyalty history, 80 orders across every status, 15
events, 8 store policies) so the app doesn't look like an empty demo:

```
npm run prisma:seed
```

**This is destructive on every run**: it clears and rebuilds books, inventory,
customers, orders, order items, loyalty transactions, events, and store policies from
scratch -- it does not append or skip. It deliberately never touches `staff_users`
beyond upserting two bookseller rows by name, since that table holds the real
Supabase Auth-linked owner account and wiping it would break login.

## Running it

From `apps/backend/`:

```
npm run dev
```

Starts the API at `http://localhost:3000` (Next.js reads `.env.local` automatically).
Try it:

```
curl http://localhost:3000/api/v1/books
curl http://localhost:3000/api/v1/policies
curl http://localhost:3000/api/v1/inventory   # staff-only -> 401 without a token
```

Public endpoints (`GET /books`, `GET /events`, `GET /policies`) work with no auth. Staff
endpoints need a real Supabase project wired up (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) plus a matching row in `StaffUser` — not
required just to run the server, only to exercise staff-only routes end-to-end.

## Tests

```
npm run typecheck        # tsc --noEmit
npm run test:unit        # lib/ business logic, no DB needed
npm run test:integration # hits riverside_test via .env.test
npm run test:e2e         # stub until Playwright + Product A (customer app) exist
```

Or all of them together, matching what the pre-push hook runs:

```
npm run typecheck && npm run test:unit && npm run test:integration && npm run test:e2e
```

### Supabase lifecycle check (manual, not part of the hook/CI suite)

```
npm run verify:supabase
```

Exercises full create/read/update/delete across every table -- plus the shared business
logic (stock status, order transitions, loyalty math) and two constraint checks (unique
ISBN, order_items -> books FK) -- against whatever `DATABASE_URL` is currently set to in
`.env.local`. Unlike the other test commands, this one writes to a real database, not an
isolated test DB, so it's deliberately excluded from `test:integration`/CI/git hooks and
only runs when invoked directly. It cleans up every row it creates in an `afterAll`
(scoped deletes by id, never a blanket `deleteMany()`), and refuses to run at all unless
invoked through this exact script (see the `SUPABASE_LIFECYCLE_CONFIRM` guard at the top
of `scripts/supabase-lifecycle.supabase.test.ts`).

## Git hooks

Husky is already wired (`npm install` at the repo root sets it up). `git commit` runs
lint + typecheck + unit tests; `git push` runs the full suite. Don't bypass with
`--no-verify` as a habit (see `../../best-practices-testing-commitandpush-learningdoc/`).

## Deployment

Both Vercel projects (`riverside-backend`, `riverside-staff-dashboard`) are connected
to this GitHub repo -- **every push to `main` auto-deploys both to production.** No
manual `vercel --prod` needed for routine changes; it's still fine to run for a quick
one-off redeploy.

Prisma migrations are **not** applied by the Vercel build (schema changes don't
auto-apply on deploy, per the technical spec). `.github/workflows/migrate-supabase.yml`
runs `prisma migrate deploy` against Supabase whenever `apps/backend/prisma/**` changes
on a push to `main`, using the `DATABASE_URL`/`DIRECT_URL` repo secrets (Settings →
Secrets and variables → Actions).

**Known caveat**: the migration workflow and the Vercel deploy aren't ordered relative
to each other -- both fire on the same push. For a schema change the backend's new code
depends on, the Vercel deploy could theoretically finish and serve traffic against the
old schema for a few seconds before the migration lands. Not a real risk at this
project's scale/traffic, but worth knowing if that ever changes -- the fix would be
gating the Vercel deploy behind the migration job (e.g. a Vercel Deploy Hook triggered
from the end of the GitHub Actions job, with auto-deploy-on-push turned off).

Also remember `postinstall: "prisma generate"` in `package.json` exists specifically so
Vercel's build cache can't ship a stale Prisma Client after a schema change -- don't
remove it.
