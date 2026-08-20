# Next.js Backend — Best Practices & Snippets
### Riverside Books Product Suite — `apps/backend`

This is the reference for how the shared Next.js backend is written. Every teammate calls into this backend from their own frontend, so consistency here isn't a style preference — it's the thing that stops four people from building four incompatible APIs by accident.

---

## 1. Project Structure

```
apps/backend/
├── app/
│   └── api/
│       └── v1/
│           ├── books/
│           │   ├── route.ts            # GET (list), POST (create)
│           │   └── [id]/route.ts        # GET, PATCH (single)
│           ├── inventory/
│           │   └── [bookId]/route.ts
│           ├── orders/
│           │   ├── route.ts
│           │   └── [id]/
│           │       ├── route.ts
│           │       └── status/route.ts
│           ├── chat/route.ts
│           └── content/generate/route.ts
├── lib/
│   ├── prisma.ts          # singleton Prisma client
│   ├── auth.ts             # session/role helpers
│   ├── api-response.ts     # standard {data, error} helpers
│   └── validation/         # zod schemas, one file per resource
├── prisma/
│   └── schema.prisma
└── .env.local
```

Route files stay thin. Business logic (stock status calculation, loyalty math) lives in `lib/`, not inline in route handlers — that way it's testable without spinning up HTTP.

## 2. Standard API Response Shape

Every endpoint returns the same envelope, success or failure. No exceptions — this is what all four frontends are built to expect.

```ts
// lib/api-response.ts
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { data: null, error: { message, code: code ?? null } },
    { status }
  );
}
```

## 3. Route Handler Pattern (App Router)

```ts
// app/api/v1/books/route.ts
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api-response";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return fail("Invalid query parameters", 400, "INVALID_QUERY");
  }

  const { q, category } = parsed.data;

  const books = await prisma.book.findMany({
    where: {
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(category && { category }),
    },
    include: { inventory: true },
  });

  return ok(books);
}
```

## 4. Input Validation — Always Zod, Never Trust the Body

```ts
// lib/validation/orders.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(7).optional(),
  items: z
    .array(
      z.object({
        bookId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
}).refine((data) => data.customerEmail || data.customerPhone, {
  message: "Either email or phone is required",
});
```

```ts
// app/api/v1/orders/route.ts (POST excerpt)
const body = await request.json();
const parsed = createOrderSchema.safeParse(body);
if (!parsed.success) {
  return fail(parsed.error.issues[0].message, 400, "VALIDATION_ERROR");
}
```

## 5. Prisma Client — Singleton Pattern

Serverless functions can spin up many instances; without this pattern you'll exhaust the Postgres connection pool fast.

```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Always use the **pooled** `DATABASE_URL` (Supabase port 6543) for this client. Migrations use `DIRECT_URL` instead — configure both in `schema.prisma`'s `datasource` block.

## 6. Auth / Role Checks

Staff-only routes (inventory writes, order status changes, policy edits, content generation) verify a real session server-side. Never accept a `role` field from the client.

```ts
// lib/auth.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function requireStaffSession() {
  const supabase = createServerClient(/* config using cookies() */);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { authorized: false as const };
  }

  const staffUser = await prisma.staffUser.findUnique({
    where: { id: session.user.id },
  });

  if (!staffUser) {
    return { authorized: false as const };
  }

  return { authorized: true as const, staffUser };
}
```

```ts
// usage inside a route handler
const auth = await requireStaffSession();
if (!auth.authorized) {
  return fail("Unauthorized", 401, "UNAUTHORIZED");
}
```

## 7. Deriving Inventory Status (Business Logic, Not Inline)

```ts
// lib/inventory.ts
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function deriveStockStatus(
  quantityOnHand: number,
  reorderThreshold: number
): StockStatus {
  if (quantityOnHand <= 0) return "out_of_stock";
  if (quantityOnHand <= reorderThreshold) return "low_stock";
  return "in_stock";
}
```

Put logic like this in `lib/` specifically so it can be unit tested in isolation (see the testing doc) without touching the database or HTTP layer.

## 8. Error Handling Convention

- Route handlers catch known errors and return `fail(...)` with an appropriate status.
- Unexpected errors are caught at the top of the handler, logged, and returned as a generic 500 — never leak stack traces or raw DB errors to the client.

```ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    // ... logic
    return ok(updated);
  } catch (err) {
    console.error("PATCH /orders/[id]/status failed:", err);
    return fail("Something went wrong", 500, "INTERNAL_ERROR");
  }
}
```

## 9. Environment Variable Validation (Fail Fast, Not at 2am)

```ts
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LLM_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

Import `env` (not `process.env` directly) anywhere a variable is needed — a missing key then fails at startup with a clear message instead of surfacing as a mystery 500 three routes deep.

## 10. Serverless-Specific Pitfalls to Avoid

- **No module-level mutable state** beyond the Prisma singleton — each invocation may be a cold instance; don't cache request-specific data in a global.
- **Keep LLM calls (`/chat`, `/content/generate`) fast or streamed** — free-tier function timeouts are short (~10s); if generation is slow, stream the response rather than waiting for the full completion.
- **Don't do heavy work in `GET` handlers that customers hit directly** (e.g., `/books`) — no synchronous LLM calls, no N+1 queries. Use `include`/`select` in Prisma to fetch related data in one round trip, as shown in section 3.
- **Idempotency for writes**: loyalty `earn`/`redeem` and order status changes should be safe to retry (e.g., check current state before transitioning) since network retries happen.

## 11. Naming Conventions

- Routes: plural nouns (`/books`, `/orders`), nested resources under their parent (`/orders/:id/status`).
- Prisma models: PascalCase singular (`Book`, `Order`); tables map to snake_case via `@@map` if preferred, but keep it consistent across the whole schema.
- Booleans/enums in the DB use `snake_case` values (`low_stock`, `pay_in_store`) to match the technical spec sheet exactly — frontends key off these literal strings.
