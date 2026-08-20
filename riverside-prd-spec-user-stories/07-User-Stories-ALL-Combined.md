# User Stories — Full Suite (Combined)
## Riverside Books Product Suite: Products A–D

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (fast-follow)

---

# Product A: Customer Ordering & Loyalty App

## Catalog & Stock
- **A1 (M)** — As a customer, I want to search for a book by title or author, so that I can quickly find out if the store carries it.
- **A2 (M)** — As a customer, I want to see a book's current stock status, so that I know whether it's worth a trip to the store.
- **A3 (S)** — As a customer, I want to browse by category, so that I can discover books without knowing an exact title.

## Pre-Orders
- **A4 (M)** — As a customer, I want to place a pre-order for pickup, so that it doesn't sell out before I arrive.
- **A5 (M)** — As a customer, I want to provide contact info with my pre-order, so that the store can reach me.
- **A6 (S)** — As a customer, I want to check my pre-order status, so that I know when to pick it up.
- **A7 (C)** — As a customer, I want to pay online, so that I don't have to handle payment at pickup.

## Loyalty
- **A8 (M)** — As a customer, I want to see my loyalty stamp count, so that I know how close I am to a reward.
- **A9 (S)** — As a customer, I want to understand the loyalty program rules, so that I have a reason to return.
- **A10 (C)** — As a customer, I want a nudge when I'm close to a reward, so that I'm encouraged to come back.

## Events
- **A11 (S)** — As a customer, I want to see upcoming events, so that I know what's happening at the store.
- **A12 (C)** — As a customer, I want to reserve an event spot, so that I don't need to call ahead.

## Account
- **A13 (M)** — As a customer, I want a lightweight account, so that orders/loyalty are tied to me without friction.
- **A14 (S)** — As a customer, I want to view my order history, so that I remember what I've bought.

---

# Product B: Staff Inventory & Ops Dashboard

## Inventory Visibility
- **B1 (M)** — As a staff member, I want a live inventory table, so that I don't rely on memory or paper.
- **B2 (M)** — As a staff member, I want low/out-of-stock titles flagged, so that I notice before a customer asks.
- **B3 (M)** — As a staff member, I want to adjust quantity on hand, so that inventory stays accurate.
- **B4 (S)** — As a staff member, I want to add a new title to the catalog, so that onboarding new stock is simple.
- **B5 (S)** — As a staff member, I want to edit price/description, so that Product A always shows correct info.

## Pre-Order Fulfillment
- **B6 (M)** — As a staff member, I want a pending pre-order queue, so that nothing is forgotten.
- **B7 (M)** — As a staff member, I want to update pre-order status, so that customers see accurate status.
- **B8 (S)** — As a staff member, I want customer contact info on a pre-order, so that I can call them when ready.

## Loyalty
- **B9 (M)** — As a staff member, I want to add a loyalty stamp for in-store purchases, so that regulars are rewarded offline too.
- **B10 (M)** — As a staff member, I want to redeem a customer's reward, so that they can use earned stamps.

## Events
- **B11 (S)** — As a staff member, I want to create/edit events, so that Product A and the chatbot stay current.

## Policies / FAQ
- **B12 (M)** — As a staff member, I want to edit store policy text, so that the chatbot reflects what's actually true.

## Reporting
- **B13 (S)** — As the owner, I want a simple weekly snapshot, so that I can see store health at a glance.

---

# Product C: Customer Support Chatbot

## General Q&A
- **C1 (M)** — As a customer, I want to ask about store hours, so that I don't have to call or check elsewhere.
- **C2 (M)** — As a customer, I want to ask about the return policy, so that I know the rules before buying.
- **C3 (S)** — As a customer, I want to ask general "how do I..." questions, so that I can self-serve.

## Live Stock Q&A
- **C4 (M)** — As a customer, I want to ask if a specific title is in stock right now, so that I don't waste a trip.
- **C5 (S)** — As a customer, I want suggested alternatives if a title is out of stock, so that I still find something.

## Events Q&A
- **C6 (S)** — As a customer, I want to ask what events are coming up, so that I don't need a separate page.

## Trust & Escalation
- **C7 (M)** — As a customer, I want the bot to admit when it doesn't know something, so that I never get bad info.
- **C8 (S)** — As a customer, I want an easy path to a real person or pre-order flow, so that I'm never stuck.

## Operational
- **C9 (M)** — As a staff member, I want conversations logged, so that I can see what customers actually ask.
- **C10 (C)** — As a customer, I want multi-language support, so that the store is accessible to more of the community.

---

# Product D: Marketing Content Generator

## Content Generation
- **D1 (M)** — As a staff member, I want to generate a caption for a specific book, so that I don't write from scratch.
- **D2 (M)** — As a staff member, I want to generate a caption for an upcoming event, so that events get consistent promotion.
- **D3 (M)** — As a staff member, I want a post idea alongside the caption, so that I know how to build the post.
- **D4 (S)** — As a staff member, I want to choose a tone/style, so that content matches the occasion.
- **D5 (M)** — As a staff member, I want to regenerate a caption, so that I'm not stuck with a bad draft.
- **D6 (M)** — As a staff member, I want to review/edit before use, so that nothing inaccurate or off-brand goes out.

## History & Reuse
- **D7 (S)** — As a staff member, I want to see past content per book/event, so that I don't repeat posts.
- **D8 (S)** — As a staff member, I want to mark content as "used," so that history stays meaningful.

## Trust & Accuracy
- **D9 (M)** — As a staff member, I want generation grounded in real data only, so that I never post something inaccurate.

---

## Cross-Product Dependency Notes

- A2, B1–B3, and C4 all depend on the **same** `inventory`/`books` tables — this is the seam to test first and most often.
- A11, B11, and C6 all depend on the shared `events` table.
- B12 is the **only** place FAQ/policy content is edited; C1/C2 read it, never duplicate it.
- D1/D2/D9 depend on `books`/`events` staying accurate, which in turn depends on B4/B5/B11 being kept up to date.
