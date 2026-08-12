# Mercury–Neptune registry-copy drift repair — 2026-08-11

## Diagnosis

This was a registry/structural defect, not unapproved copy drift in a `review_status: approved` row.

The canonical `packages/astro-knowledge/data/transits/mercury-trine-neptune.json` record is `LIVE` and contains the owner-authorized 2026-08-11 `readerCopy.body`. Its approval metadata points to `packages/astro-knowledge/review/sky-aspect-owner-refinements-2026-08-11/sky-aspect-owner-refinements-payloads.json#sky.mercury.trine.neptune`.

The failing shared registry returned the older v10.1 five-part rendering beginning `A difficult story is told...`. That wording came from a stale ignored `packages/astro-knowledge/dist/sky-runtime-web.json`, not from a change to the approved transit row. Regenerating the runtime bundle from canonical source made the registry return the approved body byte-for-byte.

No approved copy is changed by this repair.

## Root cause

`scripts/test-calendar-exact-sky-aspect-routing.mjs` compared canonical transit records with the browser registry, but it implicitly trusted whatever ignored `dist/sky-runtime-web.json` happened to exist in the worktree. A prior source update could therefore leave the runtime registry stale until a separate package build happened to run.

## Repair and regression gate

The routing-parity test now regenerates the Astro Knowledge runtime bundle directly from canonical source before bundling `skyRegistry.ts`. The existing exhaustive assertion then checks all 215 reader-eligible exact Sky records in both planet orders, including Mercury trine Neptune, and continues to verify the three screenshot regressions against their owner payloads.

This makes the test deterministic and preserves the source-of-truth boundary: generated runtime artifacts are regenerated, never edited or merged.
