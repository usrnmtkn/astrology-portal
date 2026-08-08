# Full App QA and Remediation Report — 2026-08-07

## Final status

**FULL PASS**

All functional, contract, content, admin, astronomy, build, type, cache, responsive-layout, visual-regression, and release-gate checks pass. The Calendar desktop changes were reviewed and approved, the light and dark baselines were intentionally regenerated, the focused baseline suite passed 3/3, and the final full Playwright run passed 80/80.

| Area | Result | Evidence |
| --- | --- | --- |
| Core unit/content tests | PASS | `npm test` |
| Production build | PASS | `npm run build` |
| TypeScript | PASS | `npm run typecheck` |
| Live content coverage | PASS | 120/120 rows live |
| Client flows | PASS | 47/47 functional flows and 6/6 fallback/content flows |
| Admin flows | PASS | 18/18 flows |
| Aspect-pattern matrix | PASS | API, diagnostics, real fixtures, V3, authored, activation, admin, persistence, fallback, voice, reader, and unknown-time suites |
| Independent ephemeris comparison | PASS | 12 fixtures, 305 supported facts, 0 failed fixtures, 0 discrepancies |
| Ephemeris release gate | PASS | Latest scheduled `main` workflow run succeeded; about 8.97 hours old when checked, under the 36-hour limit |
| CSS consistency | PASS with debt | 0 eyebrow mismatches and 0 non-token tracking values |
| Form typography | PASS | 0 findings |
| Bundle budgets | PASS with advisory | Explicit budgets pass; several deferred chunks still trigger Vite's 500 kB advisory |
| Editorial QA | PASS with review queue | 0 blockers; 23 warnings for human review |
| Full Playwright visual smoke | PASS | 80/80 after reviewed Calendar baseline approval |

## Eight remediation steps completed

1. **Root contracts and stale assertions** — removed the obsolete Calendar hydration assertion and revalidated the root test/build/type contract.
2. **Aspect-pattern naming and resolver boundaries** — kept natal display copy as “Grand Cross,” activation copy as the reviewed “Grand Square,” and separated the locked V3 reader path from explicit admin/persisted-record overrides.
3. **Fallback cache integrity** — rebuilt the fallback distribution and manifests, refreshed parity expectations, and updated the stale Jupiter cache fixture to verify current approved content.
4. **Friends and relationship grammar** — added grammar-aware reader placeholder rendering for second-person subjects, possessives, and sentence capitalization; exact owner-copy tests now guard against subject/verb regressions such as “you feels.”
5. **Calendar and Sky fixture alignment** — removed or refreshed obsolete content expectations while preserving the current calculated-event and approved-copy contracts.
6. **Ephemeris integrity** — ran the live NASA/JPL Horizons comparison and the recent-success release gate. No supported-fact discrepancies were found.
7. **CSS, typography, and bundle checks** — introduced tokens for compact-label, compact-pill, verification-code tracking, and verification-code font size. Tracking and form typography findings are now zero; bundle budgets pass.
8. **Editorial QA precision** — fixed the repeated-word scanner so contractions do not create false positives. It now reports zero blockers and 23 genuine human-review warnings without rewriting approved prose.

## Defects found and fixed during the pass

### Reader pronoun grammar

**Cause:** authored relationship templates were rendered with raw placeholder replacement, so replacing a third-person subject with “you” could leave third-person verbs and malformed possessives.

**Fix:** the Node and browser renderers now apply the same grammar-aware subject, possessive, and capitalization rules. Exact authored-copy and browser parity tests cover the repaired behavior.

### Stale fallback cache test

**Cause:** the test expected an obsolete Jupiter hook/aspect after the bundled approved article had changed.

**Fix:** the test now proves that an old cache self-heals to the current approved Jupiter package content.

### Aspect-pattern activation terminology

**Cause:** one name map was being used for both the natal display and activation copy, although the reviewed contracts intentionally use different labels.

**Fix:** natal output remains “Grand Cross”; activation-specific output, linked names, and authored activation copy use “Grand Square.”

### Aspect-pattern persisted overrides

**Cause:** the default V3 resolver initially ignored persisted approved admin records. Broadly routing every explicit record array to the legacy resolver fixed persistence but allowed stale caller arrays to replace locked V3 copy.

**Fix:** the public reader remains locked to V3. Admin previews, coverage tooling, and persisted production lookups must explicitly set `useLegacyResolver: true`. This preserves approved overrides without permitting accidental reader downgrades. The complete aspect-pattern matrix passes after this change.

### CSS and editorial audit noise

**Cause:** a small set of literal tracking/font-size values remained, and the repeated-word regex treated contractions as duplicate adjacent words.

**Fix:** the values now use theme tokens and the scanner excludes apostrophe-led continuations. Form typography and tracking findings are zero; editorial blockers are zero.

## Resolved finding: Calendar visual baselines

The initial full run found two visual differences:

- `client-calendar-desktop-light.png`: 28,184 pixels differ, ratio 0.02.
- `client-calendar-desktop-dark.png`: 22,232 pixels differ, ratio 0.02.

The received Calendar UI contained coherent product changes—including Today and Day/Week/Month controls, the Monday–Sunday strip, updated lunar imagery/rows, and current approved copy. Functional Calendar tests passed across desktop and mobile. The changes were reviewed and approved as intentional.

The two approved snapshots were regenerated:

- `tests/visual/visual-regression-baseline.spec.ts-snapshots/client-calendar-desktop-light-chromium-desktop-darwin.png`
- `tests/visual/visual-regression-baseline.spec.ts-snapshots/client-calendar-desktop-dark-chromium-desktop-darwin.png`

Post-approval verification:

- `npm run qa:visual-baseline`: 3/3 passed.
- `npm run visual:smoke`: 80/80 passed in 2.8 minutes.

## Recommended improvement priority

1. **P1 — Reduce the largest deferred bundles.** The budgets pass, so this is not a correctness blocker, but the relationships fallback chunk is about 3.14 MB minified / 489.74 kB gzip and should be split by content domain or loaded more selectively before launch.
2. **P2 — Human-review the 23 editorial warnings.** They are nonblocking and include directional/vague-language candidates plus at least one grammatically intentional repeated phrase. Review in context; do not bulk-rewrite approved content.
3. **P3 — Continue CSS token cleanup.** Tracking and form typography are clean. Historical audit debt remains in spacing, font sizes outside the form finding, line height, radii, shadows, and raw surface values.
4. **P4 — Expand independent ephemeris coverage.** Current supported comparisons have zero discrepancies. The remaining 375 expected gaps are unsupported-reference areas such as some points, angles, cusps, or event-bisection facts; add these incrementally rather than treating them as current failures.

Because the app is not live, the best use of the prelaunch window is to tackle P1 while architecture is still inexpensive to change. P2–P4 can proceed as controlled quality improvements.

## Generated reports

- Client report: `test-results/client-facing-qa-report/latest.md`
- Admin report: `test-results/content-dashboard-admin-qa-report/latest.md`
- This consolidated report: `docs/qa/full-qa-report-2026-08-07.md`
