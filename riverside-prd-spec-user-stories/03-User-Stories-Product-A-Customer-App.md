# User Stories — Product A: Customer Ordering & Loyalty App

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (fast-follow)

## Catalog & Stock

**A1 (M)** — As a customer, I want to search for a book by title or author, so that I can quickly find out if the store carries it.
- Acceptance: Search returns matching titles within the catalog; empty results show a clear "no matches" state rather than an error.

**A2 (M)** — As a customer, I want to see a book's current stock status (In Stock / Low Stock / Out of Stock / Available to Order), so that I know whether it's worth a trip to the store.
- Acceptance: Status shown matches the `inventory` table's current value exactly as maintained in Product B, with no separate/stale copy.

**A3 (S)** — As a customer, I want to browse by category, so that I can discover books without knowing an exact title.

## Pre-Orders

**A4 (M)** — As a customer, I want to place a pre-order for a specific title for in-store pickup, so that I don't have to worry about it being sold before I arrive.
- Acceptance: Order is created with status `placed`; confirmation is shown/sent; inventory does not need to be decremented until fulfillment (business decision documented in PRD §6.3).

**A5 (M)** — As a customer, I want to provide my contact info when I place a pre-order, so that the store can reach me when it's ready.
- Acceptance: Requires at minimum a name and one contact method (email or phone); creates or matches an existing `customers` record.

**A6 (S)** — As a customer, I want to check the status of my pre-order, so that I know when to come pick it up.
- Acceptance: Status reflects Product B's queue in real time (Placed → Ready for Pickup → Completed/Cancelled).

**A7 (C)** — As a customer, I want to pay for my pre-order online, so that I don't need to handle payment at pickup.
- Acceptance: Deferred to fast-follow per PRD §13 unless payment processor is selected in Phase 0.

## Loyalty

**A8 (M)** — As a customer, I want to see my current loyalty stamp count, so that I know how close I am to a reward.
- Acceptance: Stamp count matches `customers.loyalty_stamp_count`, updated whenever staff logs an earn/redeem transaction.

**A9 (S)** — As a customer, I want to understand how the loyalty program works (how many stamps = what reward), so that I have a reason to keep buying here.
- Acceptance: Program rules are displayed clearly (static content is acceptable for MVP).

**A10 (C)** — As a customer, I want a notification when I'm close to earning a reward, so that I'm encouraged to come back.

## Events

**A11 (S)** — As a customer, I want to see a list of upcoming author events, so that I know what's happening at the store.
- Acceptance: List reflects the shared `events` table, sorted by date.

**A12 (C)** — As a customer, I want to reserve a spot at an event, so that I don't need to call ahead.
- Acceptance: Creates an `event_tickets` record with status `reserved`; respects event capacity if set.

## Account

**A13 (M)** — As a customer, I want a lightweight account (no heavy signup), so that my orders and loyalty stamps are tied to me without friction.
- Acceptance: Email/phone-based identification is sufficient; no mandatory password-based account for MVP unless required by chosen auth approach.

**A14 (S)** — As a customer, I want to view my past order history, so that I can remember what I've bought here before.
