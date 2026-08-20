# Product Requirements Document (PRD)
## Riverside Books — Digital Product Suite

| | |
|---|---|
| **Document owner** | Product / Project Lead |
| **Status** | Draft v1.0 |
| **Last updated** | 2026-08-20 |
| **Project** | Project 1: Direct-to-Consumer Retail |

---

## 1. Executive Summary

Riverside Books is a single-location independent bookstore currently run on memory, sticky notes, and a spreadsheet. This project modernizes the customer experience and staff operations through **four connected products**, each owned by a different team member but sharing one data backbone (a single Postgres database on Supabase). The goal is not to turn Riverside Books into an e-commerce operation — it is to remove the specific frictions that cost the store sales, staff time, and customer goodwill, while keeping the shop's walk-in, call-ahead character intact.

## 2. Business Context

**Business model:** Direct-to-consumer retail. Physical books, cards, gifts, and event tickets, paid for online (pre-order deposit/full payment) or in person at checkout.

**Users:**
- **Customers** — local residents/regulars who browse in-store, call ahead, or (with this suite) go online to check stock, pre-order, or ask questions.
- **Staff** — the owner and two part-time booksellers who handle inventory, fulfillment, and customer questions during store hours.

**Pain points this suite addresses:**

| # | Pain Point | Addressed By |
|---|---|---|
| 1 | No way to check stock or pre-order remotely | Product A |
| 2 | No loyalty program, no reason for regulars to stick around | Product A |
| 3 | Inventory tracked by memory/paper — no low-stock visibility | Product B |
| 4 | Repetitive questions (hours, returns, events) interrupt staff | Product C |
| 5 | Inconsistent social media because captions take time | Product D |

## 3. Goals & Success Metrics

**Business goals**
- Reduce wasted trips and missed sales caused by stock uncertainty.
- Increase repeat visits via a lightweight loyalty mechanism.
- Free staff time currently spent on repetitive questions and manual stock checks.
- Increase social posting cadence without adding to staff workload.

**Success metrics (illustrative — replace with real baselines once available)**

| Metric | Baseline | Target (90 days post-launch) |
|---|---|---|
| Pre-orders placed online / week | 0 | 15+ |
| Loyalty program sign-ups | 0 | 100 customers |
| Staff time on stock questions/day | ~45 min (estimate) | < 15 min |
| Chatbot deflection rate (questions answered without staff) | 0% | 60%+ |
| Social posts published / week | ~1 | 4+ |
| Out-of-stock "surprise" incidents (customer told in-stock, isn't) | Frequent (anecdotal) | Near zero |

## 4. Product Suite Summary

| Product | Owner | Users | Core Job To Be Done |
|---|---|---|---|
| **A — Customer Ordering & Loyalty App** | Teammate 1 | Customers | Search catalog, see live stock, pre-order for pickup, earn loyalty stamps |
| **B — Staff Inventory & Ops Dashboard** | Teammate 2 | Staff | Live stock view, low/out-of-stock flags, pending pre-order queue |
| **C — Customer Support Chatbot** | Teammate 3 | Customers | Answer FAQs + live "is this in stock right now" questions |
| **D — Marketing Content Generator** | Teammate 4 | Staff | Generate a caption + post idea for a given book or event |

All four products read from and write to **one shared Postgres database** (Supabase), so a copy sold at the register, a pre-order placed via Product A, and a restock logged via Product B are all reflected everywhere instantly (or as close to it as a free-tier stack allows — see Non-Functional Requirements).

## 5. Shared Platform Architecture (Overview)

> Full technical detail lives in `02-Technical-Spec-Sheet.md`. This section exists so each product PRD below is read in context.

- **Backend:** A single Next.js (TypeScript) application exposing REST API routes, acting as the shared data/business-logic layer for all four products. This is where DB access lives (via Supabase's Postgres, using Prisma or the Supabase JS client).
- **Database:** One Postgres instance on Supabase's free tier, shared across all products via the backend API (no product talks to Postgres directly except the backend).
- **Product A frontend:** Standalone React (TypeScript) single-page app — the public-facing storefront/loyalty app.
- **Product B frontend:** React (TypeScript), served as the in-house, non-public staff dashboard (authenticated, internal only).
- **Product C (Chatbot):** React (TypeScript) chat widget/app, calling backend endpoints for live inventory/policy data and an LLM API for natural-language responses.
- **Product D (Content Generator):** React (TypeScript) internal tool, calling backend endpoints for book/event data and an LLM API for caption generation.
- **Hosting:** Vercel (free tier) for all frontends and the Next.js backend; Supabase (free tier) for Postgres + (optionally) Auth/Storage.

## 6. Product A — Customer Ordering & Loyalty App

### 6.1 Purpose
Let a customer check real stock, place a pre-order for in-store pickup, and earn loyalty stamps — without needing to become a full e-commerce checkout experience.

### 6.2 Primary users
Local customers and regulars, browsing on mobile or desktop.

### 6.3 Key features
1. **Catalog search** — search by title/author/ISBN; browse by category/genre.
2. **Live stock display** — each title shows "In Stock," "Low Stock," "Out of Stock," or "Available to Order" (sourced from the shared inventory table, same one Product B edits).
3. **Pre-order for pickup** — customer selects title(s), submits a pre-order with contact info and pickup preference; no shipping, pickup only.
4. **Payment** — either pay online at pre-order time or reserve-and-pay-in-store (configurable by store policy; MVP can start with reserve-and-pay-in-store to avoid payment processing complexity, with online payment as a fast-follow).
5. **Loyalty stamps** — each completed purchase (in-store checkout logged by staff, or online pre-order fulfilled) adds a stamp to the customer's account; N stamps = a defined reward (e.g., 10 stamps = $10 off).
6. **Order status** — customer can see pre-order status (Placed → Ready for Pickup → Completed).
7. **Event listing** — see upcoming author events and (optionally) reserve a ticket/seat.
8. **Account** — lightweight account (email/phone-based) to track loyalty stamps and order history.

### 6.4 Out of scope (MVP)
- Shipping/delivery.
- Full e-commerce cart with multiple payment methods.
- Public reviews/ratings.
- Gift cards (fast-follow candidate).

### 6.5 Success criteria
- A customer can determine in under 30 seconds whether a specific title is in stock.
- A customer can complete a pre-order in under 2 minutes.
- Loyalty balance is always accurate and visible.

## 7. Product B — Staff Inventory & Ops Dashboard

### 7.1 Purpose
Give staff a single, live, internal view of inventory health and the pre-order queue, replacing memory and paper.

### 7.2 Primary users
Owner and two part-time booksellers, on a shop desktop/tablet during store hours.

### 7.3 Key features
1. **Live inventory table** — title, author, quantity on hand, reorder threshold, status (In Stock / Low / Out).
2. **Low/out-of-stock flags** — visually flagged rows; optional filtered view ("Needs Reorder").
3. **Stock adjustment** — staff can increment/decrement quantity (received shipment, sold at register, damaged/returned).
4. **Pending pre-order queue** — list of pre-orders needing preparation, sorted by placed date, with status controls (Placed → Ready → Picked Up / Cancelled).
5. **Add/edit catalog items** — add a new title, edit price/description/category.
6. **Event management** — create/edit upcoming events (date, description, capacity) that feed Product A's event listing.
7. **Loyalty lookup/adjustment** — look up a customer, view/add a stamp manually (for in-person purchases), issue a reward redemption.
8. **Basic reporting** — simple counts: pre-orders this week, low-stock titles, loyalty sign-ups this month.

### 7.4 Out of scope (MVP)
- Full POS/register replacement (this dashboard supports operations, it does not replace a cash register).
- Supplier/purchase-order automation.
- Multi-location support (single store only).

### 7.5 Success criteria
- Any staff member can find a title's current stock status in under 10 seconds.
- No pre-order is missed or forgotten — every pre-order is visible in the queue until fulfilled.
- Stock updates made here are what Product A customers see, with no separate re-entry.

## 8. Product C — Customer Support Chatbot

### 8.1 Purpose
Answer the repetitive questions that currently interrupt staff — but with **real, current** answers (actual stock, actual hours, actual event schedule), not generic canned FAQs.

### 8.2 Primary users
Customers, via a chat widget on the storefront (and potentially embeddable elsewhere).

### 8.3 Key features
1. **Store info Q&A** — hours, location, return policy, general "how do I..." questions, answered from a maintained policy/FAQ source.
2. **Live stock Q&A** — "Do you have [title] in stock?" answered by querying the same inventory table Products A and B use, not a stale snapshot.
3. **Event Q&A** — "What's happening this month?" pulled from the shared events table.
4. **Escalation path** — when the bot can't answer confidently, it says so and offers a way to contact/visit the store rather than guessing.
5. **Conversation logging** — conversations are logged (with basic privacy safeguards) so staff can see what customers are actually asking, informing future FAQ/content updates.

### 8.4 Out of scope (MVP)
- Placing pre-orders through the chatbot directly (MVP links to Product A instead).
- Multi-language support (fast-follow candidate).
- Voice/phone integration.

### 8.5 Success criteria
- Chatbot correctly reflects live stock status (verified against Product B) with no lag beyond normal data refresh.
- Majority of common questions (hours, returns, "is X in stock," event schedule) are resolved without staff involvement.
- The bot never confidently states false information about stock — it says "I'm not sure, please call" rather than guessing.

## 9. Product D — Marketing Content Generator

### 9.1 Purpose
Take the friction out of social posting by generating a draft caption + post idea for a specific book or event, which staff review and publish (staff remain in control — nothing auto-publishes).

### 9.2 Primary users
Owner/staff, as an internal tool.

### 9.3 Key features
1. **Content trigger** — staff picks a book (from the shared catalog) or an event (from the shared events table) as the subject.
2. **Caption generation** — generates a short social caption in the store's voice/tone (configurable tone presets: e.g., "warm & bookish," "quick promo," "event hype").
3. **Post idea** — alongside the caption, a short suggested visual/post concept (e.g., "photo of the staff pick shelf with a handwritten card").
4. **Review & edit** — staff can regenerate, tweak, or discard before use; nothing is auto-posted to any social platform in MVP.
5. **History log** — past generated content is saved so staff can see what's already been posted about a title/event (avoids repeats).

### 9.4 Out of scope (MVP)
- Direct publishing/scheduling to social platforms (staff copy/paste for MVP; scheduling is a fast-follow).
- Image generation (MVP is text captions + a written post idea, not generated images).
- Multi-brand/multi-account support.

### 9.5 Success criteria
- Staff can go from "we should post about this" to a usable draft in under a minute.
- Generated content is accurate to the actual book/event data (no hallucinated details like wrong price or wrong date).

## 10. Shared Data Model (Summary)

All four products operate on a common core of entities. Full schema is in the technical spec sheet.

- `books` (catalog: title, author, ISBN, price, category, description)
- `inventory` (book_id, quantity_on_hand, reorder_threshold, status)
- `customers` (name, email/phone, loyalty_stamp_count)
- `orders` / `order_items` (pre-orders, status, pickup info)
- `events` (title, date, description, capacity)
- `event_tickets` (event_id, customer_id, status)
- `loyalty_transactions` (customer_id, type: earn/redeem, timestamp)
- `chat_logs` (conversation transcript, timestamp)
- `faqs` / `store_policies` (hours, returns, general info — source of truth for the chatbot)
- `marketing_content` (subject type/id, generated caption, generated post idea, status, created_by, created_at)
- `staff_users` (internal accounts, role)

## 11. Non-Functional Requirements

- **Cost:** Entire stack must run within Vercel's free tier and Supabase's free tier (see spec sheet for the specific limits this design has to respect — serverless function duration, DB storage cap, connection limits, etc.).
- **Data consistency:** Inventory changes made in Product B must be visible to Product A and Product C without manual sync steps — all reads go through the shared backend API against the same database.
- **Availability:** No formal SLA required (small single-location business); reasonable best-effort uptime via Vercel/Supabase defaults is acceptable.
- **Security:** Staff-facing tools (B, and the review/history views in D) must be authenticated; customer-facing tools (A, C) do not require login for browsing, but do require basic identity (email/phone) to place a pre-order or track loyalty.
- **Privacy:** Chat logs and customer data are not shared with third parties beyond what's required to call the LLM API for generating responses; no sensitive data (e.g., payment details) should ever pass through logs.
- **Accessibility:** Customer-facing apps (A, C) should meet basic WCAG AA practices — sufficient contrast, keyboard navigation, alt text.

## 12. Risks & Assumptions

| Risk/Assumption | Notes |
|---|---|
| Free-tier limits (Vercel function timeouts, Supabase connection pool / storage cap) constrain scale | Acceptable for a single small store; documented in spec sheet with mitigations |
| LLM API costs/rate limits for Products C & D | Needs a provider decision; budget for API usage even though hosting is free |
| Four teammates building against one shared schema | Requires the schema to be finalized and versioned early (see spec sheet) to avoid integration breakage |
| Payment processing for online pre-orders | MVP may defer to "reserve, pay in-store" to avoid PCI/payment integration scope in v1 |
| Data staleness between products | Mitigated by all products reading through the same backend API/DB rather than caching independently |

## 13. Phased Rollout

**Phase 0 — Foundation (Week 1):** Finalize shared schema, backend API skeleton, deploy pipeline (Vercel + Supabase), auth approach for staff tools.

**Phase 1 — MVP (Weeks 2–4):** Each product ships its core job-to-be-done (see feature lists above) against the shared backend.

**Phase 2 — Integration & Polish (Week 5):** Cross-product testing (e.g., a Product B stock update reflects correctly in A and C), loyalty logic end-to-end, chatbot escalation flow, content generator history log.

**Phase 3 — Fast-follows (post-launch):** Online payment for pre-orders, social scheduling/publishing for Product D, multi-language chatbot, gift cards.

## 14. Glossary

- **Pre-order:** A customer request to purchase and pick up a specific title in-store, placed via Product A before arriving.
- **Loyalty stamp:** A unit credited per qualifying purchase; N stamps redeem for a reward.
- **Low stock:** Quantity on hand at or below the configured reorder threshold for a title.
- **Deflection (chatbot):** A customer question resolved by the bot without staff intervention.
