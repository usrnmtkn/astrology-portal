# CSS and UI QA — September 7, 2026

Changes are implemented locally, uncommitted and not deployed.

Repository: `usrnmtkn/astrology-portal`. Branch: `codex/ui-css-qa-20260907`, based on `18c4b26c`. Final refreshed comparison: 0 commits ahead / 0 behind `origin/main`, with the changes below in the working tree.

## Fixed

1. **Broken lunar crescents and gibbous icons.** The half-disc shadows used 999px pill radii. Browser radius normalization flattened their curves into rectangular slices. Percentage-based half-disc tokens restore the curved terminator. Matching dark backgrounds remove the visible seam; icons cannot shrink into ovals.
2. **Clipped calendar event badges.** Badges can wrap when an aspect and void-of-course window share a day. Narrow text uses an ellipsis rather than an unexplained cut-off fragment; the date button retains the full accessible event label.
3. **Mobile calendar navigation clipped offscreen.** The header now allows its grid to shrink and moves date controls onto a second line when needed. View tabs fit within the mobile rail.
4. **Overlapping Month-view sign and illumination labels.** Content-sized rows replace fixed rows that were shorter than the moon/sign content.
5. **Clipped season dates.** Mobile season headings wrap and milestone timestamps use a second line.
6. **Mobile Friends synastry placement overlap.** Lazy-loaded desktop styles overrode the global responsive rules. Component-local responsive styles restore one column and keep planet, sign, degree and house inside each card, including the differently styled inner chart.
7. **Friends natal detail closing immediately.** Newly opened Friends details now record the overlay revision used to assemble them. The refresh effect no longer treats their first render as stale. Subsequent overlay revision invalidation remains in place.

No astrology prose, calculation, review status or content-package source was changed.

## Verification

| Check | Result |
|---|---|
| Locked dependency installation and local knowledge-package build | Passed |
| Fresh release builds / TypeScript compilation | Passed |
| CSS consistency and token integrity | Passed; no findings |
| Initial full client-facing browser suite | 78 passed, 6 failed |
| Responsive/theme/navigation follow-up | 19 passed |
| Final calendar checks | 8 passed; includes Day/Week/Month at 320, 768 and 1440px in both themes |
| Synastry placement containment | Passed at 320, 390, 768 and 1440px, light and dark |
| Friends detail/direct-link follow-up | 2 passed, 1 unresolved content-detail failure |
| Git whitespace/error check | Passed |

Screenshots were inspected for calendar views, Sky, You, Friends and Settings. Existing browser flows also exercised menus, authentication entry screens, chart forms, settings persistence, date pickers, empty Friends state, keyboard Escape and detail navigation. Tests use seeded client state and local/fallback content; they do not certify production authentication, live account data or backend availability. Some broad-suite screenshots capture loading states. The calendar geometry matrix covers locally calculated initial state; the separately captured populated calendar verifies event badges.

The initial hemisphere-route failure passed on an uncontested fresh preview. The Friends natal-detail failure passed after the UI fix. The following four broader browser checks remain unresolved and are not waived:

## Outstanding findings

| Surface/check | Observed result | Follow-up needed |
|---|---|---|
| Friends relationship tabs | No `.synastry-contact-description` exists for the seeded contact cards | Check eligible source content and the current card contract against the fixture |
| Sun in Virgo article | The expected Sun/Mercury sentence differs from the rendered related-aspect prose | Verify the approved serving source and then reconcile the exact-copy assertion |
| Sun trine Lilith article | Expected and rendered related-aspect wording differ | Verify the approved serving source and then reconcile the exact-copy assertion |
| Authored Mercury/Ascendant synastry detail | The test cannot reach `.app-shell.mode-detail`; the expected heading alone is insufficient proof of an open article | Trace the reader-facing-content gate and source eligibility for the selected contact |

A separate `test-fallback-refresh-wiring.mjs` check also failed on an expected Chiron/Jupiter prose opening that differs from the runtime output (line 326), before the relevant UI behavior could be certified by that script. The browser regressions above verify the actual Friends opening fix. Content expectations were not rewritten simply to make the suite green.

## Review artifacts

- [Calendar before](calendar-before.png)
- [Calendar after, populated](calendar-after.png)
- [Mobile dark Month view](calendar-mobile-dark.png)
- [Mobile Friends placements](friends-mobile-after.png)
- [Full baseline log](full-client-flow-baseline.log)
- [Responsive UI log](responsive-ui.log)
- [Calendar verification log](calendar-ui.log)
- [Friends detail verification log](friend-detail-ui.log)
- [Broader failure recheck](remaining-checks.log)
- [CSS audit](css-audit.log)

Local review preview: http://127.0.0.1:4197/#calendar?view=day&date=2026-09-07
