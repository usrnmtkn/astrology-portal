# Dashboard role labeling and migration

Goal: every row in the admin shows exactly one `content_role`, and "authored" vs "fallback support" can never be confused again.

## Display rules

- Role badge on every row: `full_copy` (green), `fallback_hook` (blue), `template` (blue), `vocabulary` (blue), `fallback_source` (gray, with a "never renders" tooltip).
- `fallback_source` rows have **no READY toggle** — the status column shows "source material" and nothing else. READY exists only on `full_copy`.
- Preview on a `fallback_source` row shows the material plus "This text never reaches readers. It feeds fallback authoring."
- Preview on a `template` row runs the resolver dry-run with sample facts (see `tests/verify-fallback-architecture.mjs`) so editors see finished paragraphs, not slot soup.
- Surface pages show two tabs: **Authored** (`full_copy` for this surface) and **Fallback coverage** (template + resolved vocabulary status, with per-slot eligibility and any SOURCE_GAP).

## Migration map for existing data

| Existing row / field | New content_role | Notes |
|---|---|---|
| `full_copy` records | `full_copy` | unchanged; keep review flow |
| `clauses.core_behavior`, `clauses.house_synthesis` | `fallback_source` | **stop rendering them.** The 1,439 records whose templates are `{{core_behavior}} {{house_synthesis}}` switch to `fallback-template/natal.planet-in-sign-in-house`; the clauses stay as authoring material |
| `clauses.experience`, `guidance`, `headline`, `immediate_observation`, `practical_advice`, `developmental_task`, etc. | `fallback_source` | same treatment per family |
| `fallback-hook/*` rows (template bodies) | `template` | re-key to `fallback-template/*`; natal-placement bodies replaced by the v3 split templates |
| `fallback-vocab/*` rows | `vocabulary` | add `grammar_frame` from CONTENT-ROLE-CONTRACT; legacy adjective-list `sign-style` rows retire in favor of v3 adverbial rows |
| `cc/*`, `ms/*` phrase banks, keywords, book extractions | `fallback_source` | already firewalled by SOURCE-TIER-CONTRACT; the label makes it visible in admin |
| `text_they` variants with pronoun substitution bugs | delete | v3 stores voice-neutral bodies only; voice is applied by the template |

## Migration order

1. Add `content_role` column + badge, defaulting per the map above (`roleMigrationMap` in CONTENT-ROLE-CONTRACT.json is machine-readable for the backfill).
2. Import v3 templates and vocabulary rows; wire the natal resolver to the split templates.
3. Flip natal-placement rendering: authored `full_copy` → v3 fallback → SOURCE_GAP. Verify with the package test before removing the old concatenation path.
4. Review queue: `needs_review` v3 rows (sign-style, sign-shadow, house-pressure, neutralized planet rows, placement exemplars) go to editorial; the 135 `fallback-source/placement/*/raw` drafts feed authoring of more placement-level rows at the exemplar standard.
