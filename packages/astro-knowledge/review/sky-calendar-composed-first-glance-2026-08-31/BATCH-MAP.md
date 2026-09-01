# Calendar aspect consequence-first batch map

This map covers the reader-facing aspect copy that can serve in Calendar `Exact today`.

Runtime precedence is:

1. composed sign-specific Calendar card
2. sign-specific fallback hook
3. approved exact planet-pair aspect copy
4. reviewed phrasebook hook
5. generated sign-specific aspect copy

The goal of this project is first-glance comprehension at every static layer before touching the generated fallback judge.

## Batch 1 — composed sign-specific cards

- 24 rows
- Source: `packages/astro-knowledge/data/sky-calendar/composed-cards-v1.json`
- Status: consequence-first rewrite staged for owner review
- Serving change: no

## Batch 2 — sign-specific fallback hooks

- 78 rows in `sky-aspect-phrasebook-v1.json`
- 72 are Venus/Saturn sign-specific rows: square, trine, and sextile
- 1 of those 72, `venus/virgo/trine/saturn/capricorn`, has exact owner-approved wording and is audit-only unless the owner explicitly replaces it
- 6 additional sign-specific rows are owner-authored special cases and are audit-only unless the owner explicitly replaces them
- Remaining rewrite scope after Batch 2A approval: 47 reviewed, non-exact-owner-approved rows

Sub-batches:

- **2A:** 24 Venus/Saturn squares — **exact wording owner-approved 2026-09-01**. Hash-bound approval record: `batch-2a-venus-saturn-squares-owner-approval.json`. Approved Content Studio payload: `apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-content-studio-batch-2a-v1.json`. Staged only as non-serving `studio-draft` rows; current reader-serving source remains unchanged until a separate serving promotion.
- **2B:** 23 Venus/Saturn trines requiring rewrite; keep the exact owner-approved Virgo/Capricorn trine untouched
- **2C:** 24 Venus/Saturn sextiles
- **2D:** audit the 6 owner-authored special rows for first-glance comprehension without rewriting protected wording by default

## Batch 3 — approved exact planet-pair aspect copy

- 215 exact aspect payloads in `packages/astro-knowledge/data/transits/*.json`
- Existing batch approval record: `packages/astro-knowledge/review/sky-calendar-owner-rewrites-2026-08-20/OWNER-APPROVAL.md`
- These serve when no composed or sign-specific hook wins
- Rewrite work must be staged as new wording and must not overwrite the existing exact owner-approved payloads before review

Because 215 rows is too large for one editorial pass, split by planet family / manageable review groups while preserving exact content keys.

## Batch 4 — generic reviewed phrasebook aspects

The phrasebook contains 34 generic aspect rows that can serve after the exact layer:

- 30 `sky-aspect-pair/{a}/{b}/{group}` rows
- 4 `sky-aspect-exact/{a}/{aspect}/{b}` rows

The 36 `sky-placement-sign` rows in the same file are not aspect copy and are out of scope for this Calendar aspect project.

## Batch 5 — generated fallback boundary

Generated sign-specific aspect copy can serve only after the four static layers miss. This is not a fixed rewrite corpus. After the static batches are reviewed, update the generated-content writing/judge requirements so a generated Calendar aspect must pass the same consequence-first, name-the-thing, plain-language test before serving.

## Review wall

Batch 2A is exact-wording owner-approved but remains non-serving until a separate serving promotion. Every other rewrite batch remains non-serving until exact wording is owner-approved. Protected owner-authored or exact-owner-approved rows are audit-only unless the owner explicitly authorizes replacement wording.
