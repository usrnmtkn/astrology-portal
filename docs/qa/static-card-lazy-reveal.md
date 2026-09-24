# Static card loading and lazy reveal

Sky placement, aspect, and Calendar day loading uses static bars on existing card structures. Every user receives a minimum 280 ms loading cycle and a 120 ms opacity fade, without stagger, translation, shimmer, or pulse. No runtime dependency was added. Lighthouse and Puppeteer are pinned development-only QA dependencies.

The first implementation shipped in PR #1034, main `20713030`. The follow-up repairs below address its geometry and verification gaps. Loaded prose, card markup, selection, and request identities remain unchanged.

## Geometry

Known Calendar titles, metadata, and excerpts now size their skeletons using the available text and the same prose renderer, including paragraphs, emphasis and lists. This removes the fixed two-line assumption when actual text is available. Hidden text is inside an `aria-hidden` disabled skeleton; only static bars are visible.

A bounded in-memory cache stores card heights, never reader copy. Sky and Calendar can reuse measurements during subsequent loading at the same content key, width, theme and typography. Known-content skeletons use their current text instead of stale measurements. Width or accessibility-font changes invalidate the geometry. Loaded cards never receive a fixed height or truncation.

At 390 and 1440 px in both themes, the regression checks individual cards and whole grids with `getBoundingClientRect()`:

- Short placements and season transit rows match exactly.
- Known short Calendar cards and their grids match exactly, down from the previous roughly 19 px per-card mismatch. Matching the footer's real icon height and keeping the label bar inside its line box also removes the platform-dependent discrepancy caught by Linux CI.
- Long and formatted Calendar excerpts remain within 4 px, for both cards and their grids.
- A refresh with temporarily unavailable copy retains the measured card and grid heights exactly.
- Resizing and accessibility-font changes discard incompatible measurements.

**Unknown cold-load prose and unknown event counts still use estimates.** A fixed number of placeholder lines cannot guarantee exact final geometry for arbitrary full passages. There is no universal unchanged-height or zero-CLS claim. CLS and card-height checks are separate: a replacement can change height without creating a layout-shift entry.

## Navigation and loading recovery

The aspect regression previously clicked an interim current-aspect card while the placement's complete Gifts/Lessons timeline was arriving. The final list replaces that node. Placement articles now expose `aria-busy` until their facts finish resolving; tests wait for the final dated card, click normally, and verify the dated destination and both back steps. Opening copy remains visible during hydration.

Calendar's uncancellable dynamic imports could finish after its eight-second deadline, leaving a permanent error despite successful downloads. The current Calendar instance now accepts that late success. Timeout/Retry and genuine failures retain their existing treatment; an unmounted or superseded load cannot update the reading. A browser regression holds an actual bundle until Retry appears, releases it, then verifies that full reading content returns automatically.

The draft-recovery regression verifies that an open check-in editor and its text survive automatic recovery. The separate failed-asset regression continues to exercise explicit Retry after a genuinely rejected import.

Two release tests had stale selectors: the Sky loader contains multiple status messages, and disabled skeletons share placement classes. The tests now select the Sky-specific status and resolved interactive cards respectively. Assertions and screenshot tolerances were not weakened.

The calendar-feed test used a fixed publication edit timestamp which became older than subscription creation. Its edit timestamp is now explicitly later than the created subscription, preserving the production max-modification-time contract and real database triggers.

## Mobile audit validity

Run `npm run qa:reader-lighthouse -- https://deployment.example /private/output` against a deployed reader or fully configured local server. Each route uses a cold browser and Lighthouse's default mobile DevTools throttling. The command saves JSON, HTML, a screenshot and a readiness receipt. Readiness is captured inside Lighthouse's measured navigation, before browser cleanup. It rejects synthetic `.test` hosts, unresolved skeletons, missing reader content and errors instead of accepting a fast error page.

The original failed local Sky audit made 64 requests to `visual-smoke.supabase.test`; it was not a valid production-reading measurement. The corrected unmocked audit of deployed main `20713030` showed:

- Sky: all 14 cards and complete summary, no reader error, CLS 0.000057, LCP about 12.8 s, performance 46 under actual mobile throttling. Correct loading is not evidence of acceptable speed.
- Calendar: a real timeout error after successful but slow content downloads. This prompted the late-completion repair above; the pre-repair run is not counted as a successful Calendar audit.

An unmocked audit of repair candidate `69a9615a` completed both readings without errors: Sky LCP about 13.0 s, CLS 0.000057, performance 45; Calendar LCP about 33.9 s, CLS 0.252, performance 35. These establish recovery, not acceptable cold-load speed or zero layout shift. The candidate also passed real article navigation and Calendar loading at both widths in both themes.

## Verification

Fresh-build local runs cover mobile/desktop and light/dark: geometry, static bars, accessible status, disabled skeletons, 120 ms/no-delay fades, no replay on rerender, later mounts, initial Sky/reload/article-return stability, dated aspect navigation, Calendar retention/recovery, shared-card keyboard activation and the existing dark visual baseline.

Six hook tests cover minimum duration and cancellation; three audit-validator tests reject synthetic services, error pages and incomplete readings. TypeScript, CSS/token audits, production build, bundle budget, built-asset privacy scan and the unfiltered Content Studio API suite pass locally. Hosted exact-head checks and candidate/live audit receipts belong in the repair PR; local results alone do not establish deployment.

The broader content suite previously stopped because protected report evidence was not provisioned locally; no claim of a complete content-suite pass is made.

## Retired styles

PR #1034 removed unused `.summary-skeleton` rules and shimmer keyframes, `.sky-aspect-content-loading`, `.deferred-render-placeholder` variants, `.tx-body--loading`, `.lunar-calendar-loading` and its spin keyframes, `.planet-placement-row__description-loading`, `.sky-loading-wheel` / `.sky-loading-line` pulse rules, `.feature-loading-fallback__lines`, and old Sky PageLoading sizing rules. The shared spinner remains for other screens. This follow-up removes no additional consumed loading styles.
