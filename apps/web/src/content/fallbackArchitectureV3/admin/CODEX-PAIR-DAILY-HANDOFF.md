# CODEX handoff — build "Today between you two" (dark until copy approved)

Implementation status (2026-08-06): all 28 frame rows and 68 clause rows are
owner-approved, so the dark-launch gate described below is satisfied.

Read `PAIR-DAILY-TODAY-SPEC.md` in this folder first; it is the product contract.
This document is the implementation order. Build everything dark: the surface must
render nothing until the `fallback-hook/pair-daily/*` rows land approved. Do NOT
author placeholder copy, do NOT resolve the spec's "Open questions" — build to the
spec's stated defaults.

## Ground rules (existing canon — do not relitigate)

- Copy assembles only from approved rows; missing row → `SourceGapError` → hide the
  surface. Never substitute copy.
- Resolver changes go in BOTH `resolver/renderTransitSynastry.mjs` and
  `resolver/renderTransitSynastry.browser.ts`, then rebuild
  `dist/tldr-content.js` (`npx esbuild resolver/index.browser.ts --bundle
  --format=esm --outfile=dist/tldr-content.js`).
- Friend voice via the `body_they` path / voice parameter — never pronoun
  substitution.
- Friend is referenced by `@handle`; fallback display name, then "your friend".
  Reader (owner revision 2026-08-06): openers address the reader by their own
  @handle + you-voice ("@mariesatori, you are …"). Reader with no handle → serve
  `opener/variant-3` (handle-free); never a display name for the reader, never
  third person. `renderPairDaily` takes `reader: { handle, clauseKey }`.
- Windows: this surface says "today" only; never "until {date}" and never "through".

## Task order

1. **Resolver**: add `renderPairDaily` to the transit-synastry resolver, exported like
   `renderCircleStory`. Signature per spec §Renderer API. Frame lookup:
   `fallback-hook/pair-daily/opener` (+ `/variant-2`, `/variant-3`),
   `fallback-hook/pair-daily/shared-bond/{soft|hard}` (soft: variants 2–5; hard:
   variant-2 — variant rotation must derive from the count of approved rows per
   family, never a hardcoded modulus; note `services/pairDaily.ts` currently
   returns 1–3 and needs widening),
   `fallback-hook/pair-daily/close/{family}` (overrides the do/don't pool;
   `close/hard` only when the bond transit's transiting planet is Saturn or
   Mercury — plans/timing friction — per the row's selection_note),
   `fallback-hook/pair-daily/shared-moon/{fire|earth|air|water}` (variant counts
   differ per element and will keep growing — derive rotation from the count of
   approved rows per element, same rule as shared-bond, so back-to-back
   same-element days differ).
   Clause lookup: `fallback-hook/pair-daily/clause/{group}/{natal}` where group is
   the daily-glance group of the driver's aspect (`DAILY_GROUP`) — `body_you` fills
   `{readerClause}`, `body_they` fills `{friendClause}`. ALL FIVE GROUPS
   OWNER-APPROVED 2026-08-06 (`source-rows/pair-daily-clauses-v1.json`: square,
   conjunction, opposition, soft, house — 68 rows). Missing clause row → `SourceGapError`
   (hide the surface for that pair that day).
   Slot fill via the package's existing `fill`/slot conventions; any unresolved
   `{{slot}}` → `SourceGapError`.
2. **Selection (App)**: new memo on the friend profile that computes
   `{ readerDriver, friendDriver, shared }` reusing (a) the daily-glance driver
   selection for both charts, (b) `selectedBondTransitCards[0]` + its `effectFamily`
   for `shared.kind === "bond"`, (c) today's Moon element when the Moon aspects both
   charts within the daily orb gate for `shared.kind === "moon"`. Either driver
   missing → surface hidden.
3. **Variant rotation**: stable hash of (readerChartId, friendChartId, ISO date) →
   variant slot, mirroring `stableTransitCopyVariant` usage. Same-day refreshes must
   be byte-identical.
4. **UI**: Compatibility tab, above the compatibility list. Eyebrow "Today between
   you two" + date. No feedback widget. Reuse existing eyebrow/sublabel classes;
   no new CSS unless layout demands it.
5. **Tests** (all must pass before handoff back):
   - New `scripts/test-pair-daily.mjs`: frame selection, @handle fallback chain,
     SOURCE_GAP on missing rows, variant stability per date, "today"-only window
     wording, one-hedge lint on assembled output.
   - Extend `test-fallback-refresh-wiring.mjs`: assert the App memo reuses the
     daily-glance driver selection and `selectedBondTransitCards` (no parallel
     ranking system), and that the surface renders nothing when either driver is
     absent.
   - `apps/web` `tsc --noEmit` clean.
6. **Docs**: add `renderPairDaily` to `dist/README.md` export list and
   `CODEX-TRANSIT-HANDOFF.md` API section.

## Explicitly out of scope

Day picker, themed synthesis headlines, composite daily readings (spec §Out of
scope), and ALL copy authoring — the 15-row `pair-daily/*` queue belongs to the
owner pipeline (marie-satori-writer), not this task.

## Acceptance

- With zero `pair-daily/*` rows present: app renders exactly as today (surface
  absent), full test suite unaffected.
- With test-fixture rows marked approved in a test-local bundle: paragraph renders
  per spec shape, ≤65 words, friend as @handle, no seams (no double spaces, no
  dangling connectives when slot C/D omitted).
