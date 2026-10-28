# Design handoff continuation — October 26

Local review on `codex/frontend-design-system-20261024`, HEAD `2baa1b170`:
0 ahead / 38 behind main `66a51e73b`, refreshed before work. Project memory
was refreshed from that revision; its required-context hashes match the
previously read inventory. Concurrent work was preserved.

## Remaining mismatch corrected

Horoscopes → Planets still rendered the older compact links. The supplied
`Horoscopes Container.dc.html` has reading cards with a 48px planet circle,
26px Newsreader title, UI metadata, 19px narrative preview and a calculated
progress arc. The list now reuses `PlanetPlacementRow` and its shared styles,
with three desktop columns, one compact column and the 1052px content rail.
Links retain native keyboard/history behavior and continue to open the personal
planet/house horoscope, rather than a collective Sky article.

The list and detail share the existing publication-aware preparation and
house-horoscope resolver. One full preparation serves the card list; the
selected detail retains its scoped preparation. Saved text is passed whole to
the preview and the complete reader. Publication withdrawal suppresses the
body after reload; initial source failures offer retry. No source prose,
publication state or calculation engine was edited.

Card and detail dates use the same supplied facts: retrograde station bounds,
or the calculated residency pass containing the Sky reference instant. No
speed-based estimates are introduced. Real ephemeris browser cases verify
Venus's October 2 direct visit and October 13 retrograde interval against the
Sky article, including reload. The direct visit ends October 25 instead of
combining the later return into a January endpoint.

The previously updated 26px disclosure role is now also reflected in the older
Sky typography regression. Shared card rules retain their former specificity;
an initial lower-specificity version exposed a desktop Sky glyph regression,
which was repaired and verified. Preview clamping remains scoped explicitly
to Sky and the planetary card grid; full readers stay outside it.

## Executed checks

| Check | Evidence |
| --- | --- |
| Broad page/state matrix | 208 passed / 212. Two desktop glyph failures were fixed; the publication test was corrected to exercise a failure before populating the known-good cache. The isolated 768px theme-control recheck passed without a product change. |
| First final affected matrix | 31 passed / 32. The remaining assertion expected the long month format on a Sky retrograde header that correctly uses abbreviated months; only that assertion was corrected. |
| Final fresh-build recheck | All 13 passed: four Sky typography/glyph cases, four planetary card/full-reading journeys, list/detail initial failure + retry + withdrawal, two Venus date cases, and the complete 768px light/dark header journey. |
| Web typecheck and build | Passed as prerequisites to each fresh preview. |
| CSS/token audit | Passed; no unresolved tokens or raw visual values. |
| Full-detail integrity | Passed: 1,880 protected passages, 15 consumers; the new card grid is explicitly classified as a preview. |
| React/source review | Lazy card and source modules, effect cancellation and publication identity, native links, no nested controls or new dependencies. Scoped whitespace checks passed. |

All previews use `reuseExistingServer: false`; the long-running 5173 dev server
is separate. Browser fixtures use synthetic sessions and isolated responses.
No owner journal entry, content row, private synastry draft or remote setting
was written.

Logs:

- `/private/tmp/tldrastro-design-continuation-browser.log`
- `/private/tmp/tldrastro-design-continuation-final-browser.log`
- `/private/tmp/tldrastro-design-continuation-recheck-browser.log`
- `/private/tmp/tldrastro-planets-css.log`
- `/private/tmp/tldrastro-planets-copy.log`

The live app remains running at `http://127.0.0.1:5173/`. Light/dark captures
are `test-results/planetary-cards-live-light.png` and
`test-results/planetary-cards-live-dark.png`; responsive fixture captures are
`test-results/planetary-horoscope-cards-*`.

## Bundle measurements

Matched production builds use the same synthetic preview settings. The baseline
substitutes saved pre-task TSX/lazy CSS and inlines the complete tail of global
CSS imports in their original order. Inlining an earlier stylesheet while
leaving later `@import` statements is invalid: PostCSS drops those imports.
That initial measurement was discarded. No worktree files were reverted.

| Gzip metric | Baseline | Final | Change | Limit |
| --- | ---: | ---: | ---: | ---: |
| All CSS | 134,289 | 134,306 | +17 | 134,325 |
| Startup CSS | 58,021 | 58,055 | +34 | 58,100 unchanged |
| Horoscope reader chunk | 5,514 | 5,474 | −40 | Deferred |
| App boot JavaScript | 481,469 | 481,468 | −1 | 518,200 unchanged |
| All JavaScript | 3,687,314 | 3,688,980 | +1,666 | 3,684,050 unchanged |

The documented 25-byte CSS allocation leaves 19 bytes. The JavaScript release
gate remains failing by 4,930 bytes, including 3,264 pre-existing bytes; it is
not waived. All other measured limits and lazy-boundary checks pass. There is
no performance improvement or release-readiness claim.

Source inventory: `/private/tmp/tldrastro-design-continuation-source.json`,
SHA-256 `ef4e1dc19d13bb161c69d5456858fc03fff6aeb850bfb2e3ee78e29ce404b75b`.

## Scope and reference boundaries

This pass fixes another concrete card mismatch and rechecks the existing
page/state coverage; it does not certify every remote account combination or
claim the complete prototype has been implemented. The prototype's additional
Planets filter chips include an unspecified “Changing soon” cutoff. No
hardcoded horizon, placeholder counts or invented interpretation was added.
Previously recorded backend lifecycle gaps remain as documented in the
October 25 app-wide review. Native-sheet designs are web references, not a
native-client implementation. No commit, merge or deployment was performed.
