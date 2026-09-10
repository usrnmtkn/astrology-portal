# Synastry Batch 4 canonical release

The 24 owner-approved Sun/angle/point reverse passages now live in the existing
canonical `source-rows/fallback-source-rows-v3.json` rows. The release does not
add canonical keys or rely on a Content Studio/runtime overlay. The source diff
contains exactly those 24 rows; every opposite `body_they` and every unrelated
row is preserved. Earlier 29 drafts, 76 reciprocal rows, 10 unresolved rows,
and the 344 unwritten reverses remain outside this release.

`node scripts/release-synastry-directionality.mjs` validates without writing;
`--write` promotes atomically after all guards pass. `--release=PATH` accepts
another hash-bound approved release input. The script reads the human review
map, selects the field from the missing semantic arrow, rejects reciprocal and
unresolved rows, checks approval/authorization provenance, and locks both
pre-release fields against unexpected changes. Reapplication is idempotent.
Historical source evidence is test-only and never imported by reader code.

The package version is `v3-2026-09-10d`. Browser distribution, relationship
partition, manifests, lineage, content book, evidence index and canonical
inventory/export are regenerated. Source, browser source, shipped artifact,
and Content Studio hashes agree for every released field.

Friends previously omitted North Node and the opposite chart angles. The
comparison now retains the calculated True Node once and derives Descendant
and IC at 180 degrees from the measured Ascendant/MC. Unknown axes stay absent.
The newly enabled endpoints are limited to the approved Sun families; unrelated
comparisons and the existing 16-card ranking cap remain intact.

## Validation

- Independent worktree installed with `npm ci`; local knowledge package built.
- Node/browser-source/shipped-dist regression: 24 rows, 80 concrete aspect and
  ownership combinations, explicit names and `{{Name}}`, no holder leakage.
- Release guard: every reciprocal/unresolved row rejected; both target fields
  exercised; changed approved copy and changed opposite direction rejected.
- Production Content Studio read: all 24 LIVE + serving, clear review state;
  editor and packageRecord hashes match both canonical fields. Ledger: 24 live.
- Actual Friends cards and full detail entries: the final fresh preview run
  passes all 80 aspect/ownership scenarios plus existing light/dark Synastry
  checks (82/82). The latter also verify desktop, 390 px and 320 px layouts.
  CMS hydration is disabled in release tests to prove the canonical package.
- Typecheck, web build, CSS audit, bundle budget, manifest freshness, inventory
  parity, synastry grammar, prior Ascendant approval, no-stock-closer, provenance,
  and relationship-calculation regressions pass.
- `npm run test:content` passes prerequisites and stops at the known historical
  Friends transit hash failure in `test-friends-owner-signoff-ruling.mjs:161`.
  Clean main `f36b697e` reproduces the identical actual/expected hashes documented
  in `sky-composable-blocks-2026-09-10.md`. The remaining tests were run separately.
  Existing failures also reproduce on clean main in Sky phrasebook/article/slot,
  transit provenance/pronouns, daily scene, refresh wiring, V13/lived historical
  fingerprints, weekly assembly, Jupiter transit approval and writing harness.
  The release's historical projections preserve these baseline fingerprints;
  its own exact-copy tests pass. The full content suite is not reported green.

## Bundle impact

The approved copy and direction-level provenance add approximately 5 kB to total
compressed JavaScript. Aggregate allowance increases from 2,949,000 to 2,956,000
bytes for this release. App boot is 415.3 kB gzip, reader boot 462.9 kB, startup
CSS 47.6 kB; all startup and individual chunk limits remain unchanged. No new
runtime dependency or duplicate runtime overlay is shipped.

## Deployment

Production must follow the PR merge to `main`. A preview is not production.
The production deployment and the same Friends rendered-copy regression will
be checked against the merged commit before reporting the release live.
