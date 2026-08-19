# Riverside Books product scope

## Product context

Riverside Books is an early-stage online bookstore product. The initial work is focused on creating useful customer-facing and bookstore-facing experiences without prematurely committing to a full commerce platform.

## Product D — Marketing Content Generator

This is the primary product area for the current pursuit.

### Intended outcome

Help the Riverside Books team turn book and campaign information into on-brand marketing drafts that are faster to review, adapt, and publish.

### Initial workflow questions

- What inputs should a content request accept: title, author, genre, audience, promotion, channel, and tone?
- Which outputs matter first: social posts, email copy, product descriptions, or campaign variations?
- What review and editing steps are required before content can be published?
- How should the system represent source information and unsupported claims?

### Guardrails

- Generated copy is a draft until a person reviews it.
- The system should avoid inventing book details, pricing, availability, or endorsements.
- Reusable brand guidance should be explicit and versioned.

## Product C — Customer Support Chatbot

This is a supporting product area. It should complement the marketing workflow and help customers during discovery and purchase without becoming a broad general-purpose assistant.

### Intended outcome

Help customers get quick, dependable answers about books, store policies, and the buying journey, with a clear path to human support when needed.

### Initial workflow questions

- Which support intents are most valuable at launch?
- What approved content should answer policy and catalog questions?
- When should the chatbot ask a clarifying question or hand off to a person?
- What customer information, if any, is necessary for support?

### Guardrails

- Answers should be grounded in approved Riverside Books content.
- The chatbot should clearly communicate uncertainty and avoid fabricating inventory, delivery dates, or policy exceptions.
- Sensitive customer information should not be collected unless there is a defined need and appropriate handling.

## Out of scope for the initial slice

- Full catalog, inventory, checkout, payments, and fulfillment systems.
- Unreviewed automatic publishing of generated marketing content.
- A general-purpose chatbot unrelated to Riverside Books customer support.
- Production integrations before the core workflows and data requirements are understood.
