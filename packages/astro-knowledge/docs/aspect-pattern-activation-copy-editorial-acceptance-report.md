# Aspect Pattern Activation Copy Editorial Acceptance Report

This pass reviewed, revised, and locked the governed activation fallback copy for natal aspect-pattern activation.

It does not add authored activation records, reader-facing activation UI, editable admin controls, AI generation, progression activation, empty-leg or fallout-point activation, planetary chart-shape activation, new transit calculations, or changes to activation matching, scoring, primary-trigger selection, or natal geometry.

## Files Changed

- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/copy/*.json`
- `packages/astro-knowledge/docs/aspect-pattern-activation-copy-review-ledger.md`
- `packages/astro-knowledge/docs/aspect-pattern-activation-copy-editorial-acceptance-report.md`
- `scripts/test-aspect-pattern-activation-copy.mjs`

This report accompanies the governed activation-copy implementation files, API opt-in diagnostics, admin diagnostics preview, and resolver report from the previous pass.

## Editorial Changes

- Replaced raw aspect-label headlines with ordinary contact language.
- Replaced `Timing state: ...` copy with distinct exact, applying, separating, and mixed timing sentences.
- Replaced article errors such as `a Opposition` with governed aspect phrases.
- Collapsed duplicate linked pattern names into readable counts, such as `four T-squares`.
- Added one combined multi-trigger sentence instead of repeated transit paragraphs.
- Mapped Kite internal spine role to reader-safe `resource planet` language.
- Removed guarantee language from Yod copy.
- Kept wide and partial natal-pattern confidence notes qualified.

## Golden Fixtures

Approved fixtures live under:

```text
packages/astro-knowledge/engine/aspect-patterns/fixtures/activation/copy/
```

The fixture set covers:

- T-square apex and opposition-member routes
- Grand Square shared-planet activation
- Grand Trine activation
- Kite focal-planet and resource-planet activation
- Yod apex activation
- Mystic Rectangle member activation
- single-trigger, multi-trigger, exact, applying, separating, and mixed timing routes
- wide and partial natal confidence notes
- emergency fallback for all six pattern types

Each fixture stores the activation context ID, pattern ID and type, primary trigger facts, trigger count, target role, timing state, natal confidence, selected content level, template ID, complete resolved content, missing slots, skipped sections, validation warnings, and resolver version. No identifying chart data is stored.

## Snapshot Rules

`scripts/test-aspect-pattern-activation-copy.mjs` now compares approved activation-copy JSON byte-for-byte.

To intentionally approve wording changes:

```bash
UPDATE_ACTIVATION_COPY_GOLDENS=1 npm run test:aspect-patterns-activation-copy
```

Then rerun without the update flag.

## Verification

- `UPDATE_ACTIVATION_COPY_GOLDENS=1 npm run test:aspect-patterns-activation-copy`
- `npm run test:aspect-patterns-activation-copy`
- `npm run test:aspect-patterns-activation`
- `npm run test:aspect-patterns-activation-real`
- `npm run test:aspect-patterns-diagnostics`
- `npm run test:aspect-patterns-api`
- `npm run test:natal-aspect-pattern-reader`
- `npm run test:aspect-patterns-copy`
- `npm run test:aspect-patterns -w @tldr/astro-knowledge`
- `npm run typecheck -w @tldr/web`

## Deferred Work

- authored activation-copy library
- read-only authored coverage view
- reader-facing activation UI
