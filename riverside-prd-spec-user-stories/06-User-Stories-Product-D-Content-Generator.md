# User Stories — Product D: Marketing Content Generator

Priority key: **M** = Must have (MVP), **S** = Should have, **C** = Could have (fast-follow)

## Content Generation

**D1 (M)** — As a staff member, I want to pick a specific book from the catalog and generate a social media caption about it, so that I don't have to write from scratch.
- Acceptance: Generated caption references accurate book data (title, author, category) pulled from `books`, not invented details.

**D2 (M)** — As a staff member, I want to pick an upcoming event and generate a caption promoting it, so that events get consistent promotion.
- Acceptance: Generated caption references accurate event data (date, description) pulled from `events`.

**D3 (M)** — As a staff member, I want a short post idea (visual/concept suggestion) alongside the caption, so that I know how to actually shoot/build the post, not just what to write.

**D4 (S)** — As a staff member, I want to choose a tone/style for the caption (e.g., warm & bookish, quick promo, event hype), so that content matches the occasion.
- Acceptance: At least the tone presets listed in the PRD (§9.3) are selectable and change the generated output.

**D5 (M)** — As a staff member, I want to regenerate the caption if I don't like the first result, so that I'm not stuck with a bad draft.

**D6 (M)** — As a staff member, I want to review and edit the caption before using it anywhere, so that nothing goes out that doesn't sound like us or is factually wrong.
- Acceptance: No content is auto-published to any external platform; the generator only produces a draft.

## History & Reuse

**D7 (S)** — As a staff member, I want to see past generated content for a given book or event, so that I don't accidentally repeat the same post.
- Acceptance: History view is filterable by subject (book/event) and shows status (draft/used/discarded).

**D8 (S)** — As a staff member, I want to mark a piece of generated content as "used," so that the history stays meaningful over time.

## Trust & Accuracy

**D9 (M)** — As a staff member, I want the generator to only use real data about the selected book/event, so that I never accidentally post something inaccurate (wrong price, wrong date, made-up plot details).
- Acceptance: Prompting to the LLM is grounded in the actual `books`/`events` record; no free-text "make something up" mode in MVP.
