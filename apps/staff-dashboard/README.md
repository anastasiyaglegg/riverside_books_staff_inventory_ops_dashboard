# Riverside Books — Staff Dashboard

React + TypeScript SPA (Vite), the internal, authenticated dashboard for the owner and
booksellers (Product B). Talks only to `apps/backend`'s REST API — never to Postgres or
Supabase directly except for Auth.

Screens: Login, Inventory, Add/Edit Book, Pre-Order Queue, Loyalty Lookup, Events, Store
Policies, Weekly Snapshot. See `../../riverside-prd-spec-user-stories/04-User-Stories-Product-B-Staff-Dashboard.md`
for acceptance criteria (stories B1-B13).

## Prerequisites

- `apps/backend` running locally (see its README) — this app calls it directly.
- A Supabase project with **Auth** enabled and at least one row in the backend's
  `StaffUser` table matching a real Supabase Auth user's id (so `requireStaffSession`
  on the backend recognizes you as staff). Without this, the login form will render but
  sign-in has nothing to authenticate against.

## Setup

From `apps/staff-dashboard/`:

```
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=<your Supabase project URL>
VITE_SUPABASE_ANON_KEY=<your Supabase anon/public key>
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Only public values go here — this is a browser-shipped SPA. Never put the Supabase
service role key here (that belongs only in the backend's `.env.local`).

## Running it

```
npm run dev
```

Opens at `http://localhost:5173`. Make sure `apps/backend` is running (`npm run dev`
from `apps/backend/`, default port 3000) first, or every screen will show a fetch error.

## Tests

```
npm run typecheck
npm run test:unit   # component tests (Vitest + React Testing Library), no backend needed
```

`test:integration` and `test:e2e` are stubs for this app — this SPA has no server-side
layer of its own to integration-test (all data access goes through `apps/backend`,
covered there), and no E2E harness is wired up yet.

## Notes

- Client-side order-status transition rules (in `OrdersQueuePage.tsx`) and the loyalty
  reward threshold (in `LoyaltyPage.tsx`) are duplicated from the backend's `lib/orders.ts`
  and `lib/loyalty.ts` for UI affordance (disabling invalid buttons) only. The backend
  re-validates every transition server-side regardless — this app is not the source of
  truth for those rules.
- `GET /customers` (used by the Loyalty Lookup search) isn't in the original CLAUDE.md
  endpoint table — it was added to the backend to make story B9 buildable. See
  `../backend/app/api/v1/customers/route.ts`.
