# Sky placement retrograde repair

## Reviewed behavior

The engine supplies motion correctly. Current placement cards label Rx, but the
article prefers a motion-neutral content headline and extracts the full residency
date line ahead of the current retrograde dates. Canonical Sky V4 appends its
approved planet-level retrograde modifier after the base article, leaving the
card opening unchanged. The continuous V3 fallback does not consume motion.
The V3 renderer also executes before V4 and can prevent a valid V4 result from
being considered when a legacy hook is missing. Related aspect labels omit motion.

The full `transit-retro-article` hooks contain personal/direct-address writing.
Their existence is not authority to replace the collective Sky article. Retired
placement frames are also not the approved continuous fallback. Use the released
`sky-placement/retrograde/{planet}` units, preserving all wording.

## Implementation plan

1. Resolve the approved Sky modifier as its own unit. Lead current Rx previews
   and articles with that complete unit; preserve the base placement article.
   Keep base IDs stable and record the modifier key separately in provenance.
2. Make the Rx title and computed retrograde window authoritative in current
   placement headers. Preserve the full residency as separately labeled metadata.
   Archived readings remain residency readings, without today's Rx state.
3. Apply the same approved modifier to continuous fallback output. Missing
   approved Rx content fails interpretation closed, never to direct-only copy.
   A legacy source gap must not prevent a valid canonical article from serving.
4. Preserve motion in related aspect labels and glyphs. Keep aspect prose and
   applying/separating calculations unchanged; no new aspect prose is authored.
5. Verify direct/Rx transitions, all nine supported bodies, archive behavior,
   fallback-only and missing-content cases, source/dist parity, and the actual
   rebuilt reader routes at desktop/mobile widths in light/dark themes. Run
   content, typecheck, production build, and CSS gates.

No copy approvals, source wording, database rows, or production deployment are
part of this repair. Changes are prepared on the isolated feature branch.

## Completed repair

- Current Rx articles use the calculated Rx title and station window. The full
  sign residency is preserved beneath it as `In {sign}: {date range}`.
- The existing approved collective Rx modifier leads both the card preview and
  canonical reading. Its separate content key is retained alongside the stable
  planet/sign article identity. Base units remain byte-identical and ordered.
- Fallback-only previews include the same complete approved modifier. When the
  canonical modifier cannot load, the current Rx placement interpretation is
  absent instead of presenting direct-only prose; calculated facts remain.
- A source gap in legacy current-placement content no longer blocks canonical
  content. Archive source gaps retain their previous fail-closed behavior.
- Related and standalone aspect titles identify each Rx endpoint. Glyph rendering
  preserves both endpoint markers. Exact aspect prose selection is unchanged.
- Package version is `v3-2026-09-07d`; browser dist, manifests, approval projection,
  lineage, and content book were regenerated. No source-row, authored-input, or
  knowledge-data prose changed. No approval status or serving-key set changed.

## Verification

Passed:

- Isolated `npm ci`, local `@tldr/astro-knowledge` build, typecheck, production web
  build, CSS consistency/token audits, and `git diff --check`.
- 27 planet/sign cases across all nine supported Rx bodies, source/shipped
  resolver parity, complete modifier preservation, duplicate prevention, direct
  and archive behavior, actual app adapter, and missing/unapproved/wrong-key gaps.
- Eight Playwright cases against freshly built local previews: four desktop/mobile
  and light/dark combinations, card click, reload, transition to direct, fallback
  preview, other current Rx bodies, two-Rx aspect labels/glyphs, and missing-copy
  behavior. Header typography matches the analogous direct article. Owner base
  opening and closing sentences remain rendered.
- Manual agent-browser desktop/mobile inspection; meaningful page content,
  functional controls, and no captured browser errors or error overlay.
- Sky placement regressions, key-date ephemeris/Node/browser/dist parity, serving
  gate, deferred runtime parity, fallback preview, V4 release and product-surface
  routing, exact Sky/Calendar aspect parity (758 directions), reader-copy
  contract, full-detail copy integrity, heading deduplication, and Gifts/Lessons
  grouping checks.

The aggregate content suite is not green. These identical failures were reproduced
in a separate untouched checkout of baseline `a6767f73`, with its own `npm ci` and
knowledge build:

| Existing test | Baseline failure |
| --- | --- |
| `test-content-unresolved-studio.mts` | Requires nonzero inventory, but the governed queue has zero required items. |
| `test-natal-placement-sign-house-composition.mjs` | Pins 194 rows; inventory has 195. |
| `test-reviewed-sky-aspect-phrasebook.mjs` | Pins 248 exact records; inventory has 439. |
| `test-sky-placement-app-integration.mjs` | Requires an obsolete generated-content source expression. |
| `test-fallback-refresh-wiring.mjs` | Expects superseded Chiron/Jupiter wording. |

These gates were not weakened. The affected fallback-header regression was updated
for the intended Rx date precedence and passes. The new regression is included in
`test:content`; full-suite success remains blocked by the baseline failures above.

Local screenshots: `test-results/sky-retrograde/desktop.png` and
`test-results/sky-retrograde/mobile-dark.png`. Baseline failure evidence:
`test-results/sky-retrograde/baseline-gates.jsonl`.

Implementation branch: `codex/sky-retrograde-logic-audit-20260907`. Initial work
was based on `a6767f73`. Two main commits arrived during final verification; the
branch was fast-forwarded to `43276f3c` and the uncommitted repair reapplied
cleanly, preserving the new Daily Sky publication gates. It is 0 ahead/behind
the refreshed origin/main. No repair commit was created.
No commit, merge, production deployment, or dashboard synchronization performed.

## Follow-through: Sky aspects, Calendar, and daily summary

The reviewed suggestions are implemented without rewriting approved aspect prose:

- Shared fact-only body labels preserve Rx in the main Sky list, Calendar labels,
  accessible day descriptions, and complete exact-aspect summary links. The
  existing summary verb map is shared; singular/plural grammar is unchanged.
- Both Calendar and placement-residency aspect scanners carry signs and motion
  calculated at exactness. Calendar article selection receives those event signs
  instead of dropping them. Unknown motion does not borrow the current snapshot.
  The API request includes a facts-version parameter to bypass older cached feeds.
- Calendar and summary aspect links retain the base route and add the exact
  timestamp. Click, reload, and history resolve the dated facts. The article shows
  the exact date/time instead of estimating a range from average speeds.
- An explicit station-direct event overrides current retrograde snapshot motion.
  Stations remain distinct from aspects; no station interpretation is fabricated.
- The existing pass engine was inspected: it scans residual roots, selects one
  aspect branch, groups hits using a duration-based gap, and records motion at
  every exact hit. Rx alone does not generate a series. No duplicate series model
  was introduced. Interpretive second/final-pass phrases became `Pass X of Y`;
  invalid, duplicated, unordered, or out-of-range timing inputs are suppressed.

Audit boundary: the engine's gap threshold is capped at 550 days and its search
horizon at 5,000 days per side. This repair does not certify every possible long
outer-planet recurrence or redefine the grouping heuristic. The new labels report
the computed series without promising that a final hit resolves an experience.

Additional verification:

- All four motion permutations resolve the same nonempty App aspect copy and
  source keys while independently changing endpoint labels.
- 55 exact event results across September and December 2026, including both
  scanner paths, agree with independent longitude finite differences. Tests cover
  a single Rx hit, valid 2/3/5-hit numeric labels across year boundaries, unknown
  motion, stable event IDs, duplicate summary events, and station separation.
- Actual July 2026 ephemeris timing-register tests pass, including the repeated
  Neptune–Pluto series. Daily summary tests pass all 144 sign pairs, optional
  sections, full links, finite verbs, and singular/plural agreement.
- Eleven fresh built-preview browser tests pass and cover Sky labels, Calendar date selection,
  both endpoints' glyphs, daily-summary click/reload, and a December direct
  Neptune event opened while the selected Sky date is September (Neptune Rx).
- Typecheck, CSS audit, exact Sky/Calendar routing, and V4 release checks pass.
  The previously reproduced aggregate-suite baseline failures still apply.

Reproduce the targeted browser checks with:

```sh
node --import tsx scripts/test-sky-motion-events.mts
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4286 npx playwright test tests/visual/sky-placement-retrograde.spec.ts --workers=1
```

Calendar screenshots are in `test-results/sky-retrograde/calendar-light-1440.png`
and `calendar-dark-390.png`. No commit, deployment, or CMS publication was made.

## Merge validation

Owner requested commit and merge. Rebased onto `636444ef` (live Sky clock and
summary layout), retaining both the new clock test and motion tests. Regenerated
resolver distribution, fallback manifests, content book, and writing-evidence
indexes. The knowledge-index change only refreshes source hashes for versioned
bundles; approved prose is unchanged. Updated the Calendar hydration assertion
to require exact event signs and endpoint motions with the approved-content map.
All 11 browser tests and targeted type/content/CSS checks pass on this baseline.

Reviewed the Linux CI Sky screenshot: the exact-aspect summary now includes its
Rx endpoint, the canonical Sun preview is populated after the legacy source-gap
repair, and the current main summary typography/layout is retained. Updated only
the affected desktop-light baseline from that reviewed CI rendering.
