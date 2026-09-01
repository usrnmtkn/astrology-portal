# Calendar consequence-first Content Studio staging

Date: 2026-09-01

This package moves the approved editorial direction into a safe GitHub and Content Studio workflow without changing reader-serving Calendar copy.

## What is staged

- 24 consequence-first rewrites for the currently serving composed Calendar cards.
- 24 consequence-first rewrites for Venus/Saturn sign-specific squares.
- The global writing contract now requires normal human consequences first, plain language, specific nouns, and precision rather than cute or mystical decoration.
- The opening may take more than one sentence when clarity needs more room.

The exact draft payloads are stored in:

`apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json`

## Content Studio behavior

`node scripts/stage-calendar-aspect-content-studio-drafts.mjs` validates all 48 drafts against the current serving source records and materializes versioned `studio-draft` rows.

`node scripts/stage-calendar-aspect-content-studio-drafts.mjs --apply --verify-remote` writes the 48 draft rows to the connected Content Studio data store and verifies that every row remains:

- `status=DRAFT`
- `lane=reference`
- `review_state=owner-review-required`
- `readerServing=false`
- `stageOnly=true`

The Content Studio draft keeps the current source copy as `packageOriginalRecord` and stores the proposed copy only in `packageDraft.Body`. The existing serving row is never overwritten by this staging script.

The SKY V4 preview endpoint recognizes these staged Calendar aspect keys and renders them as an `Exact today` preview. Only the Body is editable. Aspect identity, signs, source kind, source baseline hash, and governance fields remain read-only.

## Governance boundary

This package is not an owner-approval record and is not a serving release. All 48 rows remain `needs_review`, `owner_approved=false`, and `serving_enabled=false` until a later exact wording approval and explicit release.

The existing 24 composed cards and the existing phrasebook hooks continue to serve unchanged.

## Next editorial batches

See `BATCH-MAP.md`. After these 48 drafts are reviewed, continue with Venus/Saturn trines, Venus/Saturn sextiles, the protected-row audit, the 215 exact aspect payloads, the 34 generic phrasebook aspects, and finally the generated fallback judge.
