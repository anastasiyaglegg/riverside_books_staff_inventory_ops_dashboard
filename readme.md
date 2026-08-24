# Riverside Books & Gifts - Staff Operations & Inventory Dashboard

## About the Project

The Staff Operations & Inventory Dashboard is the internal staff tool for Riverside Books & Gifts, a local independent bookstore.

The dashboard gives store staff one place to manage books, inventory, customer pre-orders, and store information.

## The Problem

For a small bookstore, keeping track of inventory and customer orders can become difficult when information is spread across different places.

Staff need a simple way to know:

* What books are currently available?
* What needs to be added or updated?
* How much stock is available?
* What customers have pre-ordered?
* Which orders need attention?

## The Solution

The Staff Dashboard gives Riverside Books employees one central place to manage the information used throughout the store.

Staff can:

* Add and edit books
* Update inventory and stock
* View and manage customer pre-orders
* Manage store events
* View event RSVPs and attendees
* View customer information

## MVP

The first version focuses on the most important staff tasks:

1. Add and update books and inventory.
2. View customer pre-orders.

Additional staff and event-management features can be added later.

## How It Connects to the Riverside System

The Staff Dashboard is one of four connected Riverside Books products:

* **Customer App:** Customers search and browse books, check availability, and pre-order books for pickup.
* **Staff Dashboard:** Staff add and update books, inventory, and orders.
* **Chatbot:** Uses store, book, and availability information to answer customer questions.
* **Content Generator:** Uses book and event information to create event announcements, emails, and social media posts.

The products share the same store data so information entered by staff can be used across the Riverside system.

### Example

**Staff adds or updates a book → Customer sees the book and its availability → Chatbot can answer questions about it → Content Generator can promote it**

This keeps the four products connected instead of operating as separate tools.

## Tech Stack

* Next.js
* Supabase
* Supabase Authentication
* Vercel
* GitHub

## Future Features

Features outside of the current MVP may include:

* Event management
* RSVP and attendee management
* Customer management
* Gift cards
* Loyalty program
* Advanced analytics

## Goal

Build a simple staff tool that keeps Riverside Books information organized and up to date while supporting the customer-facing products.

The larger goal of the Riverside system is simple: **more book lovers and more community.**

## End-to-End Tests

`/e2e` at the repo root covers the two cross-cutting flows CLAUDE.md requires (staff
zeroes stock -> Out of Stock; staff advances a pre-order -> Ready for Pickup), driven
with Playwright against the real backend + staff dashboard together.

One-time setup (seeds a dedicated staff login into the dev Supabase project
`apps/backend/.env.local` already points at):

```
cd apps/backend && npm run seed:e2e-staff
```

Then from the repo root:

```
npm run test:e2e
```

This starts both dev servers automatically (backend on :3000, dashboard on :5173) if
they aren't already running, and seeds/cleans up its own test data per spec.

## Status

🚧 Currently in development
