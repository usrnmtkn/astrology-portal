# Illustrated loading on Sky and Friends

The reader document, Sky's initial reading, and Friends' route, account,
Circle and empty chart-list loading states use the shared illustration frame.
The existing readiness boundaries own dismissal. There is no minimum display
time and image download success never controls content readiness. Cached chart
rows and a revealed Sky reading remain visible during revalidation.

Fourteen supplied illustrations retain the original linework and alpha channel,
including enclosed interiors. The 512px PNGs were cropped from the owner's
Colorful Constellations Zodiac Signs pattern PNGs, with motifs crossing the
seamless pattern boundary joined before centering. The zodiac figures use
pattern 4 (SHA-256
`860eaf022334a7e50b10559710fb9e86f1a4c064f6f1e2d2d0e98adf0f7c6713`);
the Sun and Moon use pattern 2 (SHA-256
`dcc5020841940e5ba5dbb331ee89efe052704be014375e565dc89984c45b3cc3`). Original source files remain separate from the
application. No generative redraw or white fill is included.

Loading status frames sit directly on the page background, without a card
surface or border. Their spacing, illustration size, and readiness behavior
remain shared across the initial document, Sky, and Friends.

The fixed frame uses shared design tokens. Black linework is inverted in the
dark theme. After React mounts, one next illustration downloads every 2.2 seconds
and crossfades only after decoding. A failed next image retains the previous
image. Reduced motion shows a stationary illustration, hidden tabs stop cycling,
and unmount cleans up timers/listeners. The initial HTML shows the same Sun
while the small reader entry downloads.

Verification from a fresh build:

```sh
npm run test:content-studio-api
npm run qa:css-audit
npx playwright test -c playwright.config.ts --workers=1 tests/visual/loading-illustration.spec.ts tests/visual/sky-loading-layout.spec.ts
npm run qa:friends-loading-matrix
```

The focused browser regression covers Sky and Friends, light/dark, desktop/phone,
stationary frame bounds through cycling, reduced motion, artwork failures,
transparent interiors, dismissal, reload, and keeping a revealed reading during
refresh. The existing Friends matrix protects cached chart visibility and all
performance budgets. Existing Sky regressions protect copy, publication and
layout behavior.
