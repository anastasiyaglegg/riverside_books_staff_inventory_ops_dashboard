# Riverside Books Customer Support Chatbot

**Product C of the Riverside Books Four-Product Suite**

## Product Overview

The **Riverside Books Customer Support Chatbot** is an inventory-aware customer service assistant for Riverside Books, a single-location independent bookstore.

The chatbot helps customers get answers to common questions without requiring a staff member to stop what they are doing to respond.

Unlike a generic FAQ bot, Product C is designed to use the bookstore's current information so that it can answer questions such as:

* Is a specific book currently in stock?
* What are the store's hours?
* What is the return policy?
* Are there any upcoming author events?
* How can I place a pre-order for pickup?

## Business Problem

Riverside Books currently manages many customer questions manually. Customers often call or visit the store simply to find out whether a book is available, ask about store policies, or check the event schedule.

Because the owner and two part-time booksellers also manage the register, inventory, orders, and daily store operations, repetitive customer questions can interrupt higher-priority work.

Product C gives customers a simple way to get reliable answers while allowing staff to focus on running the bookstore.

## Product C's Role in the Four-Product Suite

Riverside Books is being modernized through four connected products:

### Product A — Customer Ordering & Loyalty App

Allows customers to search the catalog, check availability, place pre-orders for pickup, and earn loyalty rewards.

### Product B — Staff Inventory & Ops Dashboard

Gives bookstore staff visibility into stock levels, low-stock and out-of-stock titles, and pending customer pre-orders.

### Product C — Customer Support Chatbot

Provides customers with conversational access to current inventory information, store hours, policies, and events.

**This repository contains Product C.**

### Product D — Marketing Content Generator

Helps staff generate social media captions and post ideas for books, promotions, and upcoming store events.

## How Product C Connects to the Suite

Product C acts as the **customer information layer** of the Riverside Books system.

The chatbot should use shared bookstore data rather than maintaining a separate version of inventory information. For example, if Product B shows that a book is out of stock, Product C should be able to give the customer the same answer.

This creates a connected customer and staff experience:

**Inventory Data → Staff Dashboard → Customer Ordering → Customer Support → Marketing**

The four products solve different problems, but together they support one Riverside Books operating system.

## Primary Product Goal

Enable Riverside Books customers to get accurate answers to common questions—including current book availability—without requiring staff to answer every inquiry manually.

## Initial Scope

The first version of Product C will focus on:

1. Current book availability
2. Store hours
3. Store policies
4. Upcoming events
5. Pre-order and pickup information
6. Clear responses when information is unavailable or an error occurs

## Embedding on another site

`<ChatWidget />` is designed to drop into a host page. By default it assumes the
host page is served from the same origin as this deployment (e.g. the demo page
in `app/page.tsx`) and talks to a same-origin `/api/chat`.

To embed it on a different origin (the real storefront), set two env vars on
this deployment:

- `NEXT_PUBLIC_CHAT_API_BASE_URL` — the full base URL this deployment's
  `/api/chat` is reachable at (e.g. `https://chatbot.riversidebooks.example`).
  The widget fetches `${NEXT_PUBLIC_CHAT_API_BASE_URL}/api/chat`. Leave unset
  for same-origin use — it defaults to an empty string, which resolves to the
  same relative `/api/chat` path as before.
- `CHAT_WIDGET_ALLOWED_ORIGINS` — a comma-separated allowlist of host-page
  origins permitted to call `/api/chat` cross-origin (e.g.
  `https://www.riversidebooks.example`). `/api/chat` only sends
  `Access-Control-Allow-Origin` for an origin on this list; it is empty by
  default, so no cross-origin calls are permitted until explicitly configured.

Both are additive and off by default — the demo page's same-origin behavior is
unchanged unless these are set.

## Team Project

This repository is part of a four-person collaborative build project in which each builder owns one primary product while collaborating on testing, integration, documentation, and shared system decisions across the complete Riverside Books product suite.
# riverside-books-customer-support-chatbot
Product C of the Riverside Books four-product suite: an inventory-aware customer support chatbot for book availability, store information, policies, and events.
