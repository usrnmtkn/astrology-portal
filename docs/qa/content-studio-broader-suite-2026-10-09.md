# Content Studio broader-suite repairs

Base: `a1e2ed368145a1c7cc62eac8abc6652520fa1bce` (PR #1188 merged).
Branch: `fix/content-studio-broader-suite-20261009`. The initial and refreshed comparisons were 0 behind / 0 ahead of `origin/main`, before committing these repairs.

The preceding release reproduced 28 content-command failures on both its head and pre-change main. Five browser CI jobs also failed. This follow-up repairs those failures without changing approved source passages or their original approval records.

## Behavior repaired

- Personal transit date variables include the year consistently on Sky and You. The rendered regression compares complete North Node and South Node passages in both themes at desktop/mobile widths, after reload and publication refresh. A deterministic app-facing test also covers selected-zone midnight and year rollover.
- Gemini and Claude horoscope dispatches use the shared canonical instruction boundary. The final transport checks exact system instructions before dispatch; request bodies, schemas, headers, deadlines, stored-result retrieval, and storage checkpoints retain their existing behavior. Injected-provider tests cover all four horoscope periods and reject altered or missing instructions before any fetch. No paid generation is part of verification.
- The Daily Glance Moon/North Node supporting reference resolves its immutable pre-rewrite passage in the September 4 archive. The supersession record, archive bytes, and original field are hash-bound. The existing owner doctrine still grants the meaning; an archived passage cannot become a semantic grant. Mutated field/file hashes, role, and field selection fail closed.
- The generated inventory/export and writer-example data are refreshed from current canonical sources using their existing builders.

## Regression maintenance

Tests now follow the current inventory pagination, reader transport, cache schema, review queue, source precedence, exact aspect selection, and natal-owned introduction routing. The content lifecycle consistently uses the existing `tsx` loader for TypeScript dependency graphs instead of Node's incomplete native strip-types loading. Transit composition assertions compare the complete current approved passage and its source key.

Browser fixtures use calculated contacts eligible under the October 9 daily-peak policy. They retain the four-card cap and axis grouping. Recovery waits for personal-aspect cards after an intentionally delayed calculation worker. The lunar editor waits for close/focus restoration before its scroll assertion. Placement deep links tolerate at most one millisecond of ephemeris solver rounding and still verify the exact clicked route and date. Forecast grouping waits for calculation hydration.

## Historical evidence integrity

Original approval manifests are immutable. Test-only projections account for recorded supersessions; they do not grant approval or affect serving:

- September 4 You transit rewrites: candidate file hash, prior/proposed field hashes, authorization membership, and current field approval are checked. The August 13 Friends snapshot excludes 103 fields that were first added later; its original payload hash still passes.
- October 5 Bond naming restoration: current field hashes and restoration record are checked before projecting the original exact approved payload. Unlisted fields must retain original text.
- September 20 waxing-crescent and September 24 void-Moon revisions: two test-only snapshots preserve the historical aggregate comparison and pin each current complete row.
- V13 duplicate dispositions compare complete retained reader fields and exact approval state instead of a whole-row metadata fingerprint that already disagreed at creation in clean history.
- Clean-history integrity values were independently reproduced from existing Git revisions: compatibility source at `9974389da1f4ee38fa76c79c556f903c95dd7155`; pre-V13/lived aggregates at `c1ffebffb`; 53 component-evidence containers at `177f62a81`; locked V13 file before the `2dae0dfba` path rename. The historical manifest values remain separately asserted.
- Sky V4's 280 approved reader records have identical field fingerprints at the initial clean stage `80586230d` and this base. Commit `b9b4d6c768d2644eccb0599dca9c807edfa7a2b3` later removed external-reference metadata. Tests separately pin current container bytes and complete approved reader fields while preserving the old approval hash.

Six additional local negative controls mutate passage text, approval hashes, historical rows, and Sky container/provenance values; all must fail. These mappings cannot excuse arbitrary future changes.

## Verification evidence

The release PR records the exact tested revision, final local/hosted results, merge commit, and deployment identity. This document describes the changes and their evidence model; it does not establish a production deployment by itself.

Required acceptance covers the unfiltered content suite; the unfiltered local and exact-head hosted Content Studio API suite; all reader-recovery cases; the affected Sky/You, placement-aspect and client flows; all 16 lunar Studio cases; web typecheck; CSS/token audits; staged and built-public privacy scans; unchanged approved source files; merge-base freshness; and read-only checks of the deployed main revision. Paid prose generation and owner-content mutation are excluded from verification.
