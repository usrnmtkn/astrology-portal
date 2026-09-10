# Sky placement / You Transit parity audit

## Scope and provenance

Owner request: make the natal-aspect readings inside Sky placement horoscopes
use the transit-to-natal writing shown in You Transit. Evidence: the three
September 10 screenshots, especially Sun conjunct natal North Node.

Worktree: `codex/sky-you-transit-parity`, created from refreshed `origin/main`
at `1994179f` (zero commits ahead/behind at creation). The existing `tldrastro`
checkout contained unrelated owner changes and was left untouched.

## Causes

1. `personalizedSkyPlacementDetail` supplied `transitHouse` to
   `personalTransitPackageSection`. That optional context selected
   `renderTransitHouseEvent` before `renderTransitAspect`, so the shorter
   house/sign/effect composition displaced the exact approved You reading.
   The latter comes from the current `body_you` source rows and their generated
   transit-core package, loaded through the shipped fallback runtime.
2. Sky also had its own CMS-template override and compiled-article fallback.
   Neither was part of the You aspect-reading path; the compiled fallback could
   conceal a source gap or retirement in the shared resolver.
3. Sky supplied a snapshot timestamp; You supplied the selected date. The shared
   approximate-window helper adds fractional days to that input. A late-day
   snapshot could therefore print September 14 where You printed September 13.
   The browser's early-morning regression also proved that their fact snapshots
   differed: collective Sky uses the current instant, while You uses local noon.
   Formatting the date alone was insufficient because the aspect orb differed.
4. Precise multi-pass enrichment ran only on You. Sky's refresh identity included
   transit IDs but not updated timing, and its enrichment map could borrow a
   previous date's same-ID transit.

## Repair

- Sky now calls the same personal-aspect selector as You with the same selected
  day anchor. Return handling and approved exact/fallback precedence stay in
  that shared selector.
- Remove the separate house-event, CMS-template, and compiled-aspect detours.
  Both surfaces still hydrate the shared approved package overlay.
- Keep Sky's existing factual aspect labels and display the full selected
  passage as paragraphs. Point explainers remain separate You article sections.
- Calculate/cache the personal Sky horoscope at the same selected-day local noon
  as You, using the existing ephemeris and verified snapshot cache. This applies
  to both authenticated and locally saved profiles. The collective Sky chart
  and placement article retain their independent live snapshot.
- Run the existing timing enrichment on personalized Sky placement routes too;
  reuse enriched transits only when the exact snapshot timestamp matches, and
  refresh open articles when transit facts change.
- No source prose, approval state, ephemeris algorithm, or package resolver was
  edited. The fallback artifact remains `v3-2026-09-10e`; no fallback artifact
  regeneration or remote content synchronization is needed.

## Verification

- `scripts/test-sky-you-transit-parity.mjs`: compares the actual Sky app adapter
  with the actual You normalizer for 2,436 aspect/motion identities. The same
  four source gaps remain closed. Checks two dates, early/late timestamps,
  precise timing, and retirement without reintroducing compiled copy.
- `scripts/test-sky-personalized-transit-composition.mjs`: existing package
  coverage remains intact; the app contract now requires the shared path.
- `tests/visual/sky-you-transit-parity.spec.ts`: fresh production build and
  preview; actual local ephemeris/profile calculation; checks full opening and
  ending, paragraph equality, dates, reloads, content refresh, desktop/mobile,
  light/dark, page errors, and horizontal overflow.

## Final results

Passed:

- App-facing parity matrix: 2,436 cases, including four matching source gaps.
- Browser release-path regression: 4/4, desktop/mobile × light/dark, early and
  late September 10 snapshots. Both surfaces show September 13 for the Sun–North
  Node fixture. The browser computes real natal and daily ephemeris facts.
- Typecheck and fresh production web build.
- CSS/token audit and `git diff --check`.
- Personalized composition, approved You refresh, natal pass timing, You LIVE
  wiring, deferred Sky runtime, and placement regression checks.

Existing baseline failures, reproduced independently from untouched `HEAD`
files exported to temporary directories:

- `npm run test:content` stops at
  `test-friends-owner-signoff-ruling.mjs:161`: historical approval payload hash
  mismatch (`84bcb934...` versus recorded `9ae494a7...`).
- `test-fallback-refresh-wiring.mjs:326` expects an older Chiron/Jupiter opening;
  the current approved You source supplies the refreshed passage. It fails
  identically in the untouched baseline.

No content assertions were weakened and no historical records were modified.
The full content suite is therefore not claimed green. Final refreshed remote
comparison: `codex/sky-you-transit-parity` is 0 commits ahead and 0 behind
`origin/main` (`1994179f`), with the fix uncommitted in this isolated worktree.
It has not been merged, synchronized to the CMS, or published to production.


The follow-up retirement audit moved the complete fix to
`/Users/mprez/Code/tldrastro-composition-retirement`, branch
`codex/composition-retirement`, based on current main `83c96331`. The earlier
branch and evidence above describe the initial diagnosis. See
[the lifecycle audit](composition-lifecycle-audit-2026-09-10.md) for final
current-main validation and release status.
