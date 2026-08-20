# User Stories — Product C: Customer Support Chatbot

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (fast-follow)

## General Q&A

**C1 (M)** — As a customer, I want to ask the chatbot about store hours, so that I don't have to call or check multiple places.
- Acceptance: Answer is sourced from `store_policies` (key: `hours`), not hardcoded/guessed by the model.

**C2 (M)** — As a customer, I want to ask about the return policy, so that I know the rules before I buy.
- Acceptance: Answer is sourced from `store_policies` (key: `return_policy`).

**C3 (S)** — As a customer, I want to ask general "how do I..." questions (e.g., "how do I place a pre-order"), so that I can self-serve without waiting for staff.

## Live Stock Q&A

**C4 (M)** — As a customer, I want to ask "Do you have [book title] in stock right now?" and get an accurate, current answer, so that I don't waste a trip.
- Acceptance: Bot queries the same `books`/`inventory` data Product B maintains at request time; answer must not be based on a stale cache or the model's general knowledge of the book.

**C5 (S)** — As a customer, I want the bot to suggest similar or related titles if the one I asked about is out of stock, so that I still find something useful.

## Events Q&A

**C6 (S)** — As a customer, I want to ask what events are coming up, so that I don't have to check a separate page.
- Acceptance: Sourced from the shared `events` table.

## Trust & Escalation

**C7 (M)** — As a customer, I want the bot to tell me clearly when it doesn't know something, rather than guessing, so that I don't get bad information about stock or policy.
- Acceptance: For any question outside available data (policies, inventory, events), the bot responds with an explicit "not sure, here's how to reach the store" rather than a fabricated answer.

**C8 (S)** — As a customer, I want an easy way to get to a real person or the pre-order flow from the chat, so that I'm not stuck if the bot can't finish helping me.
- Acceptance: Bot surfaces a link to Product A (pre-order/contact) when relevant.

## Operational

**C9 (M)** — As a staff member, I want chatbot conversations logged, so that I can see what customers are actually asking and improve policies/FAQ content over time.
- Acceptance: Conversations are stored in `chat_logs`; no sensitive payment data is ever captured.

**C10 (C)** — As a customer, I want to ask questions in more than one language, so that the store is accessible to more of the community.
