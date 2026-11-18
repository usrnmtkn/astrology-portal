# Zodiac wheel label clearance — October 27, 2026

The owner reported degree labels touching planetary glyphs and angle badges covering planets. The requested badge alignment is the inner boundary of the zodiac sign band.

## Implemented

- Center ASC, DSC, MC and IC badges on the sign band's inner boundary (`signInner`, radius 240), including paired charts.
- Size the inward degree offset from the visible glyph and degree-label bounds, so diagonal placements have sufficient clearance.
- Resolve remaining glyph, degree and angle-badge collisions by adjusting displayed marker placement. Paired charts also reserve the inner ring's label bounds; transit overlays reserve outward degree labels.
- Preserve calculated longitudes, exact position ticks, aspect endpoints, glyph/font sizes, ring dimensions and source content. Inspector keyboard and pointer interactions remain available.

## Verification

All checks below passed against the current local wheel changes:

- 24 production-browser cases: 20 rendered cases covering Sky, natal, composite, synastry and transit wheels at 390 and 1440 pixels in light and dark themes, plus four existing calculated-Sky design and inspector cases. Tests measure actual glyph, degree and badge bounds, verify badge centering, and exercise inspector keyboard/pointer controls.
- Geometry tests cover dense clusters, all rotations, house containment, exact ticks, the existing 300 irregular charts, and 300 additional irregular composite/paired charts with non-orthogonal angle axes.
- Web TypeScript checks, CSS consistency/token audits, production bundle budgets and `git diff --check HEAD`.
- The native local Sky preview was inspected with the updated components loaded.

Receipts and screenshots: `test-results/zodiac-wheel-label-clearance-2026-10-27/`. The clean calculated-Sky screenshot uses the existing browser test's deterministic data fixture; `local-preview.png` records the native local browser view.

## Release state

Changes remain local and uncommitted on `codex/ui-release-qa-20261027`, based on `4fc3d7dde9dcb67ed8408419953bc5aa4dcead56`. The final refreshed comparison with `origin/main` was 0 ahead / 0 behind. The previous owner checkout was not modified.

No bundle caps were increased for this fix. No commit, push, merge or deployment was performed. The earlier integration's 560 browser cases and full API/content gates predate this wheel patch; they were not repeated here. Rerun the required full API gate before a future merge.

## Follow-up: glyph and degree strokes

The owner requested continued work on the glyphs and degree lines. The earlier browser assertions covered labels against other labels, but did not cover tick strokes against labels.

Longitude strokes now use shared geometry and a consistent nominal six-unit length. The main strokes begin at the inner zodiac divider; transit strokes begin at the outer divider. Displayed glyph lanes reserve space for the strokes. In paired charts, a clearance mask stops inner-ring strokes from showing beneath glyphs or degree text, allowing the labels to keep their placement instead of shifting around those strokes. Angle badges render above coincident strokes. If the first circular packing cut is blocked, the resolver tries the remaining cuts instead of returning a partly resolved layout.

The follow-up assertions include rendered stroke widths and paired-chart mask coverage when checking glyph/degree clearance, nominal tick lengths, angle-badge drawing order, and exact calculated tick angles. The 300 irregular composite/paired cases now reserve and check outer tick bounds as well. Presentation marker radii changed; surface ring radii, glyph sizes, calculated longitudes, degree values and aspect anchors did not.
