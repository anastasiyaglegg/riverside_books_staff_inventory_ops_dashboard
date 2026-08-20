# Source

The application package will live under `src/riverside_marketing/`.

Planned boundaries:

- `data/` — loading and validating catalog records.
- `generation/` — turning validated book inputs into deterministic drafts.
- `outputs/` — channel-specific draft representations and handoff formats.

The current implementation layers are:

- `data/validation.py` — loads the Product D book contract, validates individual records, loads JSON collections, and quarantines invalid entries.
- `generation/drafts.py` — creates deterministic promotional-description, social-media, and email-campaign drafts from validated records.
- `orchestration.py` — coordinates catalog loading, per-record validation, rejected-record diagnostics, and draft generation.

External AI generation, APIs, user interfaces, and publishing workflows are intentionally out of scope.
