# Commit & Push Practices — Riverside Books Product Suite

Four people, one shared schema and API. The git history is the only record of *why* something changed once everyone's moved on to the next feature — so it needs to actually be readable, not just present.

---

## 1. The Core Rule: One Subtask = One Commit

Break your work into the smallest logical, complete, working units — then commit each one separately. Don't batch an entire feature (schema change + API route + frontend + tests) into a single commit; don't commit half-working code either.

**Good breakdown for "add pre-order creation":**
1. `feat(db): add orders and order_items tables to schema`
2. `feat(api): add POST /api/v1/orders endpoint`
3. `test(api): add integration tests for POST /orders`
4. `feat(customer-app): add pre-order form and submission flow`
5. `test(customer-app): add tests for pre-order form validation`

Each of those is independently reviewable, independently revertable, and tells its own small story. That's the goal — not "fewer commits," not "more commits," but **one commit per coherent unit of work**.

**A commit is the wrong size if:**
- It touches unrelated parts of the codebase for unrelated reasons ("fix order bug + update chatbot copy" → two commits).
- It leaves the app in a broken/non-building state and you're "planning to fix it in the next commit."
- The commit message needs the word "and" to describe more than one thing happening (`fix bug and add feature` → two commits).

## 2. Commit Message Format — Conventional Commits

```
<type>(<scope>): <short summary, imperative mood, no period>

<optional body — the "why," not just the "what">

<optional footer — e.g. "Closes #14">
```

### Types

| Type | Use for |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `refactor` | Code change that doesn't change behavior |
| `test` | Adding or fixing tests only |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, config — no source logic change |
| `perf` | Performance improvement |
| `style` | Formatting only, no logic change |

### Scope

The affected app or area: `db`, `api`, `customer-app`, `staff-dashboard`, `chatbot`, `content-generator`, `auth`, `ci`.

### Summary line

- Imperative mood: "add," "fix," "remove" — not "added," "adds," "fixing."
- Under ~72 characters.
- No trailing period.
- Describes *what changed*, not *what you did in your day* ("wip", "more changes", "fix stuff" are not acceptable — see §4).

## 3. Examples

**Good:**
```
feat(api): add PATCH /api/v1/orders/:id/status endpoint

Staff dashboard needs to transition orders through placed →
ready_for_pickup → completed/cancelled. Validates status
transitions server-side so an invalid jump (e.g. placed →
completed) is rejected.
```

```
fix(inventory): correct low_stock threshold comparison

Was using < instead of <=, so a title exactly at its reorder
threshold showed as in_stock instead of low_stock.
```

```
test(chatbot): add integration test for stock-status query grounding

Verifies the /chat endpoint answers "is X in stock" using live
inventory data rather than the LLM's general knowledge of the book.
```

**Bad (and why):**
```
update stuff              ← no type, no scope, says nothing
fix                        ← fix what?
WIP                        ← never commit WIP to a shared branch (see §5)
feat: added the thing and also fixed a bug and updated docs   ← three commits pretending to be one
```

## 4. What Never Gets Committed As-Is

- `console.log` debugging statements left in.
- Commented-out blocks of old code "just in case."
- Commit messages like `wip`, `asdf`, `fix`, `final`, `final final`, `actually final`.
- Secrets, API keys, `.env` files (confirm `.gitignore` covers them before your first commit).

## 5. Branching

- `main` is always deployable — this is what Vercel production tracks.
- Work happens on feature branches: `feat/preorder-status-endpoint`, `fix/loyalty-redeem-race-condition`.
- Branch names use the same `type/scope-description` shape as commit types, in kebab-case.
- No direct commits to `main` — every change goes through a branch and a PR, even small ones, so CI (see testing doc §9) actually runs.

## 6. Push Rules

- **Every push must have a green test suite locally first** — the pre-push hook (testing doc §8) enforces this automatically; don't override it with `--no-verify` as a habit.
- Push small and often within your branch — don't sit on 15 commits locally for three days. Frequent pushes to your own branch make it easier for teammates to see in-progress direction and easier for you to recover if your machine has opinions.
- Force-pushing (`--force`) is only acceptable on your own feature branch, never on `main`, and only to clean up your own commit history before a PR — never to overwrite someone else's work.

## 7. Pull Requests

- One PR per feature/fix, matching the branch — not a grab-bag of unrelated commits.
- PR description states: what changed, why, and how it was tested (which of the tests in the testing doc cover it).
- Any change to `prisma/schema.prisma` requires review from at least one other teammate before merge (per the technical spec sheet §9) — it affects all four products.
- Squash-merging is fine for tidying a messy branch history into `main`, but the *individual* commits during review should still follow §1–§2 so reviewers can actually follow the diff.

## 8. Quick Reference Checklist

- [ ] Is this commit one coherent, complete, working unit of work?
- [ ] Does the message follow `type(scope): summary`?
- [ ] Is the summary written in imperative mood and under ~72 characters?
- [ ] Did I remove debug logs / commented-out code before committing?
- [ ] Are all tests green before I push (pre-push hook will catch this, but don't rely on it as your only check)?
- [ ] Is this going to a feature branch, not directly to `main`?
