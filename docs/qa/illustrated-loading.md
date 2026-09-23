# Lightweight loading indicators

Owner direction, September 23, 2026: remove Thinking Orbs and return to
traditional loading. Page and inline waits now use a shared CSS spinner and
existing status text. Lazy route imports and the content-readiness boundaries
still own dismissal; there is no minimum display duration.

The indicator has no canvas, JavaScript animation clock, theme observer, image
download, or third-party dependency. It uses the shared color, size, border,
and motion tokens. Compact statuses use the smaller size. Hidden reader
subtrees and reduced-motion users receive a stationary indicator.

The pre-JavaScript reader and standalone Content Studio documents use the same
CSS indicator. React reader, Friends, Calendar, You, report, and Studio loading
states share it. The old `tldrastro:loadingVisual` setting is no longer read:
a saved artwork preference cannot restore image downloads or an orb fallback.
Original artwork files are retained as unused assets; their provenance is
preserved in Git history.

Cached chart rows and revealed Sky readings remain visible during revalidation.
Leaving and returning to Sky must not replay the full-page loader. Publication,
calculation, exact-copy, and error/retry behavior are unchanged.

The historical browser-suite filename remains in CI:

```sh
npm run test:content-studio-api
npm run test:performance-contracts
npm run qa:css-audit
npm run qa:bundle
npx playwright test -c playwright.config.ts --workers=1 tests/visual/loading-illustration.spec.ts tests/visual/sky-loading-layout.spec.ts tests/visual/app-loading-feedback.spec.ts tests/visual/you-loading-performance.spec.ts tests/visual/friends-loading-performance.spec.ts
```

Coverage checks both themes and desktop/mobile layouts, no decorative asset
requests even with a legacy artwork setting, hidden-reader animation suppression,
reduced motion, initial HTML paint, dismissal, revalidation, route return, and
article navigation. The removal reduces startup bytes and decorative work;
it does not by itself establish a load-time improvement or fix the separately
observed slow-mobile calculation timeout.
