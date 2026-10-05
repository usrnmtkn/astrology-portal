# Relationship chart design recovery — 2026-10-05

The owner requested: “please use that to update the synastry and composite charts in the app”.
“That” refers to the recovered archived task, **!important! Refine zodiac wheel glyph layout**
(`thread:01a0a2ae-601e-7131-a0cb-6c4fd1e7d9ef`, last updated 2026-09-15).
Its uncommitted implementation was recovered as source changes, without importing the
retired clone's history. The earlier font/card work is already present on current main.

## Subsequent page-fit correction

The scrollable viewport and on-chart display controls were removed after the
owner's follow-up. Relationship wheels now share the natal wheel's square
`-24 -24 648 648` canvas and responsive page sizing. Glyph dimensions remain
26 units for composite and outer synastry planets, and 22 for inner synastry
planets. House-contained rows are retained when they fit; otherwise labels
spread around the fixed ring in longitude order. Exact degree ticks and aspect
anchors do not move. A crowded house no longer enlarges the canvas.

Aspect colors, composite style and composite glyph-ring preferences now live
under the existing Astrology settings section for guests and members. Existing
browser preference keys are preserved. Profile and full-screen charts consume
those saved preferences without rendering display settings beside the wheel.
The full-screen dialog fits its square canvas between the header and footer.

The release notes below describe the earlier recovery, including its superseded
scrolling behavior. The current browser regression checks page fit, unchanged
glyph sizes, site-menu discovery, persistence, both themes and both viewport sizes.

## Tested source

- Remote: `https://github.com/usrnmtkn/astrology-portal.git`.
- Branch: `codex/relationship-chart-design-20261005`.
- Original recovery base: `80d60f32b2e6787e6d635c1d71db984f34961c07`.
- Matched-build base: `dfe6c5c08d2b25c375af9fd5468f71198e57c3bd`.
- Final integration also includes main's subsequent article-heading simplification
  from PR #1128 (`cb5735586`) and Studio API audit from PR #1126
  (`d28deca8f4dcbc79dc6956efe7e80e208379329f`). Current-head checks belong to the
  release PR; the chart implementation is unchanged by these rebases.
- Local application/browser/API checks passed on `005cf0a8a`; subsequent changes
  only document the results and the measured bundle allocation.
- Fresh remote comparison before push: 0 behind / 1 ahead.
- SHA-256 of the 15 changed source/test/package/budget files, sorted by path and encoded
  as path + NUL + contents + NUL: `6eae943288307442f7f06661615321283c04fc3c7637baa0eb12b6173ba02249`.
  This report is excluded from the source fingerprint.
- The current source includes the owner's follow-up correction, “don't reduce
  the glyph sizes” (`thread:01a10bf3-4853-75d3-8f2a-ec9da81d92e3`, 2026-10-05).

## Behavior

Synastry uses this outside-to-inside order: zodiac names, first person's planets,
first person's houses, second person's houses, second person's planets, aspects.
Both house rings contain all twelve labels at a fixed radius. Planet labels stay
within their actual sign/whole-sign house and preserve longitude order; degree
ticks and aspect endpoints retain exact calculated angles.

Crowded groups keep the same glyph and degree-label sizes as isolated planets.
The layout adds full-size radial rows and expands the surrounding rings when
needed. Its scrollable viewport preserves normal on-screen glyph size rather
than shrinking the larger canvas to fit. Full-screen charts use the available
width to reveal more of the wheel. Glyph sizes remain 26 SVG units for composite
and outer synastry planets, and 22 for inner synastry planets, with no per-group
scaling. Responsive sizing remains the same for crowded and isolated glyphs.

Composite uses the recovered compact grouping, finer aspect lines and endpoint
dots. Its display controls offer Standard/Monochrome and an optional glyph ring
(80% opacity in Monochrome). Both relationship wheels offer Default/Bright aspect
colors with a compact legend. Preferences persist locally after reload and stay
in sync between inline and full-screen charts. The existing full-screen component
now has a reachable button. Its body scrolls when required, keeping the close
button and comparison picker visible.

The geometric and appearance changes in the shared single-wheel renderer are
limited to the composite variant. No calculation engine or reader prose changed.

## Acceptance evidence

The initial browser regression used isolated synthetic profiles, a freshly built
local preview, Chromium, and intercepted service responses. Its source fingerprint
was `02107f06d8c303d39a07f1be89ac44926c3447b3fa988254b31439a1e2f5385f`.
Those results predate the fixed-size glyph correction. The latest direct browser
check used a temporary synthetic fixture rendering the actual chart components
on the running Vite server. Neither is production QA.

### Latest correction

| Criterion | Result | Evidence |
| --- | --- | --- |
| Dense groups retain full glyph and degree sizes | Passed | Geometry regressions assert scale 1, non-overlapping boxes, correct signs and longitude order across dense groups, rotations and 300 irregular charts |
| Expanding the wheel does not reduce on-screen glyph sizes | Passed, isolated fixture | At an inline viewport width of 514px, every outer synastry and composite glyph measured 20.623px and every inner synastry glyph 17.450px, including clustered points; these equal the normal 26/22 × 514/648 sizes |
| Full-screen synastry uses additional width without page overflow | Passed, isolated fixture | At 1280 × 720, viewport width 1116px, canvas width 825.14px, constant inner glyph width 18.686px; close button visible |
| Revised full app flow, dark theme, mobile, settings persistence, full-screen footer | Passed | All four light/dark × 1440/390 relationship variants passed on the release candidate, with measured glyph widths and footer bounds |

The temporary fixture has been removed. The first full release run found that
the desktop Friends rail's generic SVG sizing rule still overrode the expanded
canvas. That rule now excludes SVGs inside the relationship viewport. The unchanged
glyph-size assertion passed after the fix in both themes and widths. Geometry,
CSS audit, application typecheck, fresh web build, and the complete API suite passed.
The release selection passed **11 browser tests**, including seven chart tests and
all four article-heading cases preserved during rebase. Earlier automatic-review
capacity failures are resolved; there is no remaining local browser-check block.

### Initial recovery, before the fixed-size correction

| Criterion | Result | Evidence |
| --- | --- | --- |
| Open existing saved charts and discover relationship tabs on desktop/mobile | Passed | Existing saved-chart actions, narrow overflow-menu and mobile navigation flows |
| Correct synastry ring order and all 24 house numbers | Passed | Rendered geometry assertions, light/dark at 1440px and 390px |
| Glyph containment, longitude order, overlap prevention, unchanged exact angles | Passed | Layout regression: cusps, dense groups, rotations and 300 irregular charts |
| Display controls render compact colored swatches without page overflow | Passed | Computed swatch colors/dimensions and horizontal overflow checks |
| Composite aspects visible by default; glyph/keyboard aspect inspection works | Passed | Both new relationship flows and existing cross-wheel inspector flow |
| Settings survive reload and synchronize with full-screen chart | Passed | Monochrome, ring and Bright persistence plus full-screen-to-inline update |
| Full-screen chart opens/closes and footer fits the dialog | Passed | Light/dark, desktop/mobile; final regression checks footer bounds |
| Complete synastry and composite write-ups remain accessible | Passed | Existing first-visit/detail tests, including opening/final copy assertions |
| Empty saved-chart list remains usable | Passed | Existing empty Friends flow |
| Calculation loading terminates in a visible error on ephemeris failure | Passed | Existing actual rendered calculation-error flow |
| Natal/transit interaction remains intact | Passed | Existing cross-wheel inspector flow verifies saved charts and excluded transit inspection |
| Production deployment, authenticated live saved data, non-Chromium browsers | Unverified | No deployment or owner-data mutation performed |

Commands/results:

- `npm run test:synastry-wheel` — passed SSR and geometry checks; geometry checks
  are now included in this existing test command.
- `npm run qa:css-audit` — passed again after the fixed-size correction.
- Web build/typecheck — passed; web build rerun after final viewport CSS changes.
- Focused browser regression selection — **18 passed**; after the final modal
  height correction, all **4 relationship design variants passed again**.
- `npm run test:content-studio-api` — entire local suite passed, including its
  local knowledge-build prerequisite.
- Privacy guard using protected policy — passed for 10,789 repository files and
  354 built web assets. The policy itself was not copied into this worktree.
- `git diff --check` — passed.

Build output still reports the existing mixed JSON import-attribute warning and
large-chunk warning. Neither blocks the successful build.

Earlier local screenshots are under `test-results/playwright/` in the four
`client-facing-user-flows-r-…chart-design-…-chromium-desktop` directories:
`synastry.png`, `composite.png`, and `composite-fullscreen.png`.
Run logs are in `/private/tmp/tldr-chart-{browser,browser-final,css,api}.log`.
Release logs: `/private/tmp/tldr-chart-release-{browser-final,api-final,css,typecheck,bundle-final}.log`.

## Bundle comparison

Main and feature use separate `npm ci` dependencies and identical build environment:
visual-smoke Supabase placeholders, natal aspect patterns enabled, phone auth disabled,
and empty local-only Mapbox/redirect overrides. No dependencies or reader prose changed.

| Gzip bytes | Main dfe6c5c08 | Feature 005cf0a8a | Increase | Release cap |
| --- | ---: | ---: | ---: | ---: |
| App JavaScript boot | 460632 | 463889 | 3257 | 464500 |
| Reader boot including CSS | 513940 | 517890 | 3950 | 518350 |
| Startup CSS | 53308 | 54001 | 693 | 54750 |
| Total CSS | 114597 | 115556 | 959 | 116000 |
| Total JavaScript | 3523075 | 3525250 | 2175 | 3525850 |
| Shared Memory stylesheet | 28951 | 29199 | 248 | 29450 |

The added layout, viewport and controls remain in the existing shared chart path.
Theme tokens also enter the shared Studio stylesheet. The scoped allocation retains
individual chunk, lazy-loading and runtime-performance limits. A preliminary signup
size difference came from local phone auth being enabled; matching CI removed it,
so the signup limit is unchanged. The final bundle check and all 354 built-asset
privacy checks passed.

## Local sign-in

The local worktree lacked its browser auth configuration. An ignored, mode-0600
`apps/web/.env.local` now contains the existing project's browser-safe Supabase
URL/publishable key and a callback to `http://127.0.0.1:5186/`; no service-role
credentials were copied. The provider settings endpoint returned 200, Google
authorization initiated successfully, and a cancelled synthetic OAuth attempt
returned to the local callback origin. The form renders Email, Password, Google
and Phone controls without the missing-configuration warning.

Owner sign-in and retrieval of the owner's saved charts remain unverified.
Local sign-in is separate from the live site's session. The development server
remains on port 5186; login route: `http://127.0.0.1:5186/?auth=login#you`.

## Release status

The owner authorized merge and live release on 2026-10-05 in
`thread:01a10bf3-4853-75d3-8f2a-ec9da81d92e3`. Local acceptance checks passed.
The release PR must retain the exact final head SHA, required GitHub API check,
privacy checks, merge SHA, Vercel production revision and deployed chart-flow
results. Production release follows the repository's main-only Git integration;
no feature-branch promotion or production data mutation is needed.
The first hosted preview was READY at `61d2268`, but unauthenticated synthetic
browser tests encountered Vercel's login page. Preview authentication was not
bypassed. Local tests cover the application; deployed frontend verification will
use the public production alias after merge.
