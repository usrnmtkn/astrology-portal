# Synastry Directionality Inventory

Date started: 2026-09-07  
Human review completed: 2026-09-08  
Status: **483-row directionality classification complete**  
Serving changes authorized: **no**

## Purpose

Determine which existing Friends synastry rows need a genuinely new semantic reverse so the primary card can answer:

> **What does {{Name}} bring out in me?**

The existing `body_you` / `body_they` fields remain grammatical holder variants. They are not treated as opposite astrological meanings.

## Corpus reviewed

The governed serving baseline remains:

- 483 synastry rows
- 161 canonical body pairs
- 161 `conjunction` rows
- 161 `hard` rows
- 161 `soft` rows
- 55 `exact-owner-approved`
- 110 `owner-approved-grouped`
- 318 `legacy-reviewed`

No serving row, approval record, renderer, Content Studio surface, or canonical source copy is changed by this review.

## Human directionality result

After line-by-line semantic review:

- **397 `AUTHOR_REVERSE`**: the current passage has a directional mechanism and the opposite body-to-body direction would tell the reader something materially different.
- **76 `RECIPROCAL_NO_REVERSE`**: the current relationship mechanism is genuinely shared enough that a second direction would manufacture a distinction.
- **10 `NEEDS_DIRECTION_REVIEW`**: the existing passage mixes the two roles in a way that should not be forced into either category yet.

This reduces the bounded reverse-writing project from the previously unclassified 478 rows to **397 new reverse-direction passages**, plus a separate editorial decision on 10 mixed-role rows.

## Special-review queue

The remaining 10 rows are:

- `fallback-hook/synastry-pair/venus/mars/hard`
- `fallback-hook/synastry-pair/chiron/south-node/conjunction`
- `fallback-hook/synastry-pair/chiron/south-node/hard`
- `fallback-hook/synastry-pair/chiron/south-node/soft`
- `fallback-hook/synastry-pair/chiron/lilith/conjunction`
- `fallback-hook/synastry-pair/chiron/lilith/hard`
- `fallback-hook/synastry-pair/chiron/lilith/soft`
- `fallback-hook/synastry-pair/south-node/lilith/conjunction`
- `fallback-hook/synastry-pair/south-node/lilith/hard`
- `fallback-hook/synastry-pair/south-node/lilith/soft`

These are held because the existing prose describes both roles or a shared mechanism strongly enough that simply assigning one arrow would misrepresent what was written.

## Reciprocal control ruling

`fallback-hook/synastry-pair/moon/south-node/soft` is now explicitly classified `RECIPROCAL_NO_REVERSE`.

Its existing meaning is shared familiarity and emotional ease between the two people. A second directional passage is not required merely because the future schema can hold one.

## Missing-key correction during audit

The complete source check also caught two rows that were omitted from the working classification map during the manual pass:

- `fallback-hook/synastry-pair/mars/descendant/soft`
- `fallback-hook/synastry-pair/chiron/descendant/conjunction`

Both exist in the serving corpus and are now classified `AUTHOR_REVERSE`, bringing the review to the full 483 rows.

## Review implementation

Human decisions are recorded in:

- `scripts/synastry-directionality-human-review.mjs`

The read-only human-review inventory builder is:

- `scripts/build-synastry-directionality-human-review.mjs`

The regression contract is:

- `scripts/test-synastry-directionality-human-review.mjs`

Run:

```bash
node scripts/test-synastry-directionality-inventory.mjs
node scripts/test-synastry-directionality-human-review.mjs
node scripts/build-synastry-directionality-human-review.mjs
```

The human-review builder writes review artifacts only under this directory. It does not mutate the serving source.

## Authoring gate

Existing serving prose remains locked.

The next stage is additive reverse-direction authoring for the 397 `AUTHOR_REVERSE` rows in small Project Author-calibrated batches. The 76 reciprocal rows receive no manufactured reverse. The 10 special-review rows remain outside mass authoring until their editorial mechanism is resolved.
