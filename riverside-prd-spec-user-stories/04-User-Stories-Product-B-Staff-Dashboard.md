# User Stories — Product B: Staff Inventory & Ops Dashboard

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (fast-follow)

## Inventory Visibility

**B1 (M)** — As a staff member, I want to see a live table of all titles with current quantity on hand, so that I don't have to rely on memory or a paper log.
- Acceptance: Table reflects the shared `inventory` table in real time (or on refresh); no manual reconciliation step needed.

**B2 (M)** — As a staff member, I want titles at or below their reorder threshold visually flagged, so that I notice low stock before a customer asks and it's too late.
- Acceptance: Status column/badge clearly distinguishes In Stock / Low Stock / Out of Stock; a filtered "Needs Reorder" view is available.

**B3 (M)** — As a staff member, I want to adjust a title's quantity on hand (received shipment, sold, damaged), so that the inventory record stays accurate.
- Acceptance: Adjustment updates `inventory.quantity_on_hand` and recalculates status; change is attributed to the staff user and timestamped.

**B4 (S)** — As a staff member, I want to add a brand-new title to the catalog, so that I don't need a separate system to onboard new stock.
- Acceptance: Creates a `books` row plus a corresponding `inventory` row.

**B5 (S)** — As a staff member, I want to edit a title's price or description, so that customer-facing info (Product A) stays correct.

## Pre-Order Fulfillment

**B6 (M)** — As a staff member, I want to see a queue of pending pre-orders, so that nothing gets forgotten.
- Acceptance: Queue lists all orders with status `placed` or `ready_for_pickup`, sorted oldest first by default.

**B7 (M)** — As a staff member, I want to update a pre-order's status (Ready for Pickup, Completed, Cancelled), so that the customer sees accurate status in Product A.
- Acceptance: Status change is immediately reflected in the `orders` table and visible to Product A.

**B8 (S)** — As a staff member, I want to see the customer's contact info on a pre-order, so that I can call them when it's ready.

## Loyalty

**B9 (M)** — As a staff member, I want to look up a customer and add a loyalty stamp after an in-store purchase, so that regulars are rewarded even when they don't order online.
- Acceptance: Creates a `loyalty_transactions` row of type `earn`; increments `customers.loyalty_stamp_count`.

**B10 (M)** — As a staff member, I want to redeem a customer's reward, so that they can use their earned stamps.
- Acceptance: Creates a `loyalty_transactions` row of type `redeem`; decrements balance per program rules.

## Events

**B11 (S)** — As a staff member, I want to create and edit upcoming events, so that Product A and the chatbot always show current event info.
- Acceptance: Changes to `events` are immediately reflected in Product A's event listing and Product C's answers.

## Policies / FAQ Content

**B12 (M)** — As a staff member, I want to edit store policy text (hours, returns, general FAQ), so that the chatbot answers reflect what's actually true today.
- Acceptance: Edits update `store_policies`, which Product C reads directly (no separate content system to maintain).

## Reporting

**B13 (S)** — As the owner, I want a simple weekly snapshot (pre-orders this week, low-stock count, new loyalty sign-ups), so that I can see how the store is doing without digging through raw tables.
