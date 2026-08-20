# Learning Doc: The Tech Stack, Explained for Humans
### (Specifically, humans who are excellent at prompting an AI and have, until now, been able to politely avoid knowing what a "connection pool" is)

This doc exists because you can't debug — or sensibly review a PR for — a piece of technology you've never had explained to you in plain English. Each section covers one piece of the stack: what it actually is, why it's in this project specifically, and where it tends to bite people. No prior knowledge assumed; mild sarcasm assumed throughout, entirely free of charge.

---

## 1. The Big Picture First

Before the individual pieces, here's the shape of the whole thing:

```
[Your browser] ──requests──> [React frontend]
                                     │
                                     │ calls
                                     ▼
                          [Next.js backend API]
                                     │
                                     │ queries
                                     ▼
                          [Postgres database (Supabase)]
```

Four frontends (Products A–D), one backend, one database. The backend is the only thing allowed to talk to the database. This is not a suggestion — it's the entire reason four people can build four products without stepping on each other's toes. If a frontend ever talks to the database directly, something has gone wrong.

## 2. TypeScript — "JavaScript, But It Judges You Before Runtime"

**What it is:** JavaScript with a type system bolted on. You declare what shape your data is (a `Book` has a `title` that's a `string`, a `price` that's a `number`), and the compiler checks you're being honest about it *before* the code ever runs.

**Why it's here:** Four people are sharing one API contract. Without types, "the backend sends `price` as a number but the frontend expects a string" is a bug you find in production, at 11pm, from a customer's angry email. With types, it's a red squiggly line in your editor five seconds after you typed it.

**Where it bites:** `any` is the type system's off switch. It compiles, it feels fine, and it means TypeScript has quietly stopped checking anything. Avoid it the way you'd avoid disabling smoke detectors because they're noisy.

## 3. React — "A Way to Describe What the Screen Should Look Like"

**What it is:** A library for building UIs out of small, reusable pieces called **components**. Instead of manually telling the browser "now change this bit of text," you describe *what the UI should look like given the current data*, and React figures out how to update the screen when that data changes.

**Key concept — state:** Data that can change over time and that the UI needs to react to (a search box's text, whether a modal is open, the list of books returned from an API call). When state changes, React re-renders the affected components.

**Where it bites:** Forgetting that state updates are asynchronous, and that a component re-renders every time its state changes — so putting something expensive directly in a component body without care can make things (needlessly) slow. You don't need to master this on day one; you need to know it's a thing so "why is this re-rendering constantly" has somewhere to go.

## 4. Next.js — "React, Plus a Backend, Plus Opinions About How to Organize Both"

**What it is:** A framework built on top of React that adds, among other things: server-side API routes (so it can *be* your backend, not just your frontend), file-based routing (the folder structure *is* the URL structure), and deployment conventions that Vercel (made by the same company) understands natively.

**Why it's here specifically:** The shared backend (`apps/backend`) is a Next.js app used *only* for its API routes — no pages, no UI. Each API route lives in a file (`app/api/v1/books/route.ts`), and the file's location in the folder tree literally determines its URL (`/api/v1/books`). This is why the backend best-practices doc is so insistent about folder structure — in Next.js, the folder structure isn't just tidiness, it's the routing table.

**Where it bites:** Confusing "Next.js the backend" with "Next.js the frontend framework." In this project, we're deliberately only using its backend/API capabilities for `apps/backend` — the actual product frontends are plain React apps that *call* this backend over HTTP, same as any other client would.

## 5. REST APIs — "How the Frontend and Backend Agree to Talk to Each Other"

**What it is:** A convention for structuring web requests: a URL identifies *what* you're talking about (`/api/v1/orders/123`), and an HTTP method identifies *what you want to do to it* (`GET` = read, `POST` = create, `PATCH` = update, `DELETE` = remove).

**Why it's here:** It's the contract between four frontends and one backend. The technical spec sheet's API table (§5) is the actual agreement — if you need data a listed endpoint doesn't provide, that's a conversation with whoever owns the backend that day, not a reason to query the database directly.

**Where it bites:** Assuming an endpoint does more than it does. `GET /books` returns books; it does not, on its own, tell you if today is a Tuesday. Read the contract before assuming.

## 6. PostgreSQL — "Where the Data Actually Lives"

**What it is:** A relational database. Data is stored in **tables** (rows and columns, like a very strict spreadsheet), and tables relate to each other via **foreign keys** — e.g., every row in `inventory` points at exactly one row in `books` via a `book_id` column.

**Why it's here:** It's the single source of truth. One `inventory` table, read by Products A, B, and C — not three separate copies quietly drifting out of sync. That's the entire point of a shared database instead of each product having its own.

**Key vocabulary:**
- **Table** — a collection of rows with the same columns (e.g., `books`).
- **Row** — one record (one specific book).
- **Foreign key** — a column that points at another table's row, creating a relationship (`inventory.book_id` → `books.id`).
- **Migration** — a versioned, scripted change to the schema (add a column, add a table) so everyone's database structure stays in sync as the project evolves. You never hand-edit the database structure directly — you write a migration.

**Where it bites:** Changing the schema without a migration, or without telling anyone. Four products depend on this schema; an unannounced change is how three other people's apps break without warning. This is why the spec sheet requires review on any `schema.prisma` change.

## 7. Prisma — "A Translator Between TypeScript and SQL"

**What it is:** An ORM (Object-Relational Mapper) — a library that lets you query the Postgres database using TypeScript function calls (`prisma.book.findMany(...)`) instead of writing raw SQL by hand, while also generating TypeScript types directly from your database schema.

**Why it's here:** It's what gives you `prisma.book.findMany({ where: { category: "fiction" } })` instead of hand-writing `SELECT * FROM books WHERE category = 'fiction'`, and — more importantly for a 4-person team — it means the schema in `prisma/schema.prisma` is the *single* source of truth for both the database structure and the TypeScript types everyone codes against.

**Where it bites:** The generated types are only accurate immediately after you've run a migration and regenerated the client (`prisma generate`). If your editor is showing a type error that seems to contradict the schema, that's usually the fix.

## 8. Supabase — "Postgres, Hosted, Plus Some Handy Extras"

**What it is:** A hosted Postgres database (so nobody has to run and maintain a database server themselves) that also bundles **Auth** (login/session management) and **Storage** (file uploads) as optional extras.

**Why it's here:** Free-tier hosted Postgres, plus we're using its Auth product for staff logins (Product B, D) and lightweight customer identification (Product A), instead of building an authentication system from scratch — which is a genuinely bad way to spend anyone's limited time on a bookstore app.

**Where it bites:** There's a difference between the **pooled connection** (for normal app queries, lots of short-lived connections from serverless functions) and the **direct connection** (for running migrations). Using the wrong one for the wrong purpose is a classic "works locally, breaks in production" surprise — see the backend best-practices doc §5.

## 9. Vercel — "Where the Code Actually Runs, Once It's Not Just on Your Laptop"

**What it is:** A hosting platform, built by the same company as Next.js, that deploys your app automatically whenever you push code — and, importantly, runs your backend code as **serverless functions** rather than one continuously-running server.

**Serverless, unpacked:** Instead of one server that's always on, waiting for requests, your backend code runs *on demand* — a request comes in, a function spins up (or reuses a "warm" instance), handles it, and shuts back down. This is cheap (free, in our case) but has consequences: you can't rely on anything being "remembered" between requests in memory, and there are execution time limits (see backend doc §10).

**Why it's here:** Free hosting for both the frontends and the backend, automatic deployments on every push, and preview URLs on every pull request so you can see a change live before it merges.

**Where it bites:** Treating it like a traditional always-on server — caching things in a global variable and expecting them to persist, or writing code that assumes it has unlimited time to run. It doesn't. Neither do you, most days, but the analogy holds.

## 10. Git & GitHub — "The Thing That Remembers Everything So You Don't Have To"

**What it is:** Git tracks every change to the codebase as a series of **commits** (snapshots with a message explaining what changed and why). GitHub hosts the shared repository and adds collaboration tools on top — pull requests, code review, CI.

**Key vocabulary:**
- **Commit** — one saved snapshot of changes, with a message (see the commit practices doc).
- **Branch** — an independent line of work, so you can build a feature without touching `main` until it's ready.
- **Pull Request (PR)** — a request to merge your branch into `main`, with a diff for teammates to review.
- **Merge** — combining a branch's changes into another (usually `main`).
- **CI (Continuous Integration)** — automated checks (tests, linting) that run on every PR, so a human doesn't have to manually verify "does this still work" every time.

**Why it matters here:** With four people editing a shared schema and API, git history is genuinely the only reliable record of *why* something changed. This is the entire reasoning behind the commit practices doc — a readable history is a debugging tool, not paperwork.

**Where it bites:** Treating commits as a save button ("committed my progress" with a vague message) instead of as documentation. Future-you, six weeks from now, staring at a bug, will not thank past-you for `git commit -m "stuff"`.

## 11. Testing (Unit / Integration / E2E) — "Proving It Works, Automatically, Forever"

**What it is:** Code that checks other code. Instead of manually clicking through the app every time you change something to confirm nothing broke, you write a test once, and it re-verifies that behavior automatically, every time, in seconds.

**The three layers, in plain terms:**
- **Unit test** — checks one small function in isolation. "Given quantity 0, does `deriveStockStatus` return `out_of_stock`?" No database, no network, just logic.
- **Integration test** — checks a bigger slice working together, e.g., an entire API endpoint including a real (test) database. "Does `POST /orders` actually create a row and return it correctly?"
- **End-to-end (E2E) test** — checks a full real-world flow through the actual running app, clicking through it the way a user would (via automation, not a person). "Does a pre-order placed in Product A actually show up in Product B?"

**Why it's here so aggressively:** Four products, one shared backend. Without tests, "I changed the orders endpoint" is a statement of faith. With tests, it's a statement of fact — the pre-commit/pre-push hooks and CI (see the testing doc) exist specifically so nobody has to *trust* that a change didn't break someone else's product; they can *know*.

**Where it bites:** Writing a test that always passes regardless of what the code does (asserting something trivially true) gives false confidence, which is arguably worse than no test at all — it looks like safety without providing any.

## 12. Environment Variables — "Secrets and Settings That Don't Belong in Code"

**What it is:** Configuration (database URLs, API keys) supplied to the app from outside the codebase, via a `.env` file locally or the hosting platform's settings in production — never hardcoded into a source file.

**Why it's here:** Different environments (local, preview, production) need different database connections and keys; and secrets committed into git are, functionally, public forever, even if you delete them in a later commit. Git remembers.

**Where it bites:** Accidentally committing a `.env` file. Check `.gitignore` covers it *before* your first commit, not after your first leaked key.

## 13. Suggested Order to Actually Learn This In

You don't need to master all thirteen sections before writing your first line of code. Rough sequence that tends to work:

1. **REST APIs** (§5) + **the standard response shape** (backend doc §2) — so you can read/call any endpoint.
2. **TypeScript basics** (§2) — enough to read the types you'll be working with constantly.
3. **React fundamentals** (§3) — if you're on a frontend product.
4. **Postgres + Prisma** (§6–7) — once you need to touch the schema or write a query.
5. **Testing** (§11) — as soon as you write your first real function; don't save it for "later."
6. **Git practices** (§10) — immediately, in parallel with everything else, since you're committing from day one regardless of what you understand yet.
7. **Next.js specifics, Supabase, Vercel** (§4, §8, §9) — as you actually hit them; they're the "how it's hosted and organized" layer, and make more sense once you've got a request/response mental model from §5 and §1.

Nobody expects fluency by Friday. The goal is that when something breaks, you have a mental map of *where* to even start looking — which, it turns out, is most of the job anyway.
