# Static card loading and lazy reveal

The Sky placement, aspect, and Calendar day card loading treatment uses static bars on the existing card structures. Every user receives the same treatment: a minimum 280 ms loading cycle followed by a 120 ms opacity fade, without stagger, translation, shimmer, or pulse. No runtime dependency was added.

The minimum belongs to a list's presentation state, not its request. Sky still waits for its existing summary and placement readiness conditions. Calendar errors bypass the minimum immediately. Loaded copy and request selection are unchanged. Constant `is-revealing` classes animate on DOM mount, not on ordinary React rerenders; newly mounted cards get the same fade.

Skeleton controls are disabled, removed from the tab order, and `aria-hidden`. List containers expose `aria-busy`; existing loading messages remain in `role="status"` text. Shared PageLoading consumers outside these lists remain available.

## Geometry limitation

**The universal 4 px / unchanged-container acceptance criterion is not met.** Preserving full, variable-length loaded copy and a variable number of events is incompatible with always using one description line, two excerpt lines, and default counts while the data is unknown. This change does not truncate copy, clamp cards, or fix their loaded heights to conceal that difference.

Measured with `getBoundingClientRect()` at 390 and 1440 px, in both themes:

| Case | Skeleton | Loaded | Result |
| --- | --- | --- | --- |
| Placement with a short, single-line description | 192.55 px | 192.55 px | Exact match |
| Three such placements, including gaps | 593.64 px | 593.64 px | Exact match |
| Season transit row | 52 px | 52 px | Exact match |
| Three season transit rows, including gaps | 160 px | 160 px | Exact match |
| Normal desktop stoic card | 270 px | 270 px | Existing minimum preserves height |
| Wide stoic card with a one-line excerpt | 202.80 px | 183.73 px | Fixed two-line skeleton is 19.06 px taller |
| Mobile stoic card with a one-line excerpt | 202.80 px | 183.73 px | Same 19.06 px difference |

Long passages and changing event counts also change container height. The real mobile Sky fixture's first card measured about 192 px pending and 215 px loaded. Related aspects may contain narrative timing and multiple full paragraphs, beyond the requested single-line placeholder.

The Sky route observation recorded CLS 0 in the inspected cold-load trace despite these height differences. A new element replacing another can visibly change the page without counting as a layout-shift entry. CLS therefore does not substitute for the separate height acceptance check. Existing Sky tests now distinguish the real Transits section from its loading replacement when checking that revealed content remains stable; the CLS assertion remains intact.

This remains a draft until the owner accepts the variable-content exceptions or authorizes a different loaded layout / placeholder line-count contract.

## Retired styles

Removed the unused `.summary-skeleton` rules and shimmer keyframes, `.sky-aspect-content-loading`, `.deferred-render-placeholder` variants, `.tx-body--loading`, `.lunar-calendar-loading` and its spin keyframes, `.planet-placement-row__description-loading`, `.sky-loading-wheel` / `.sky-loading-line` pulse family, `.feature-loading-fallback__lines`, and the old Sky PageLoading sizing rules. The shared loading spinner remains because other screens still consume it.

## Verification

- Six isolated React hook tests cover fast and slow responses, a later loading cycle, rerenders, restarting during a hold, custom duration, Strict Mode, and unmount cleanup.
- Browser fixtures cover both themes and widths, static bars, accessible loading text, disabled skeletons, 120 ms/no-delay opacity fades, no replay on rerender, later card mounts, default Calendar counts, and error bypass.
- Real Sky and Calendar reading flows verify complete copy and stable revealed content. Geometry JSON and screenshots are emitted into Playwright results.
- TypeScript, the production build, CSS audits, bundle budget, Sky loading contract, aspect grouping, browser-suite coverage, and the unfiltered Content Studio API suite passed locally.
- The 21-test route/geometry run passed 20 tests. The aspect article test verified its copy and fade but timed out clicking a related aspect while the route transition intercepted the pointer and the target was replaced. A diagnostic with the new fade disabled reproduced the blocked click. This navigation issue remains unresolved; it is not counted as a pass.
- The broader `test:content` command stopped in its report-generation prerequisite because protected report evidence is not provisioned in this checkout.
- The Calendar hydration source assertion for the season event-range call fails on both the base commit and candidate. The Friends render assertion expecting “Easy recognition” also fails with the original components supplied through Vite. Neither assertion was weakened or treated as a successful test.

Successful-reading Lighthouse acceptance remains unverified. Lighthouse 13.5.0 mobile runs used a production build, local unchanged Sky/Calendar calculation handlers, and the empty-publication/bundled-content fixture. A normal browser check confirmed 14 resolved Sky cards and complete Calendar prose against that fixture. Under Lighthouse, even with a 20-second collection pause, Sky reached a placement-loading error; its CLS number is therefore not evidence for a successful reading. Calendar recorded CLS 0, but that does not establish unchanged card-list heights. No production speed or universal zero-CLS claim is made.

The automated card tests are in `tests/visual/lazy-reveal.spec.ts`; the hook tests run with `npm run test:minimum-loading`. The browser workflow runs both.
