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

The fixed frame uses shared design tokens. Black linework is inverted in the
dark theme. After React mounts, one next illustration downloads every 2.2 seconds
and crossfades only after decoding. A failed next image retains the previous
image. Reduced motion shows a stationary illustration, hidden tabs stop cycling,
and unmount cleans up timers/listeners. The initial HTML shows the same Sun
while the small reader entry downloads.

If no illustration is usable after an image failure, the frame displays the
`working` animation from [Thinking Orbs](https://libraries.dev/orbs)
(`thinking-orbs` 0.3.1, MIT) as the owner's requested backup. It uses the tuned
64px canvas preset within the same reserved frame, follows the app theme, and
respects reduced motion and tab visibility. A decoded replacement restores the
artwork; either visual remains decorative beside the accessible loading status.
The dependency is bundled locally so the backup does not depend on another
image host or a separate runtime request after an image has failed.

The startup root contains the initial card's margins before the app's lazy CSS
arrives. This prevents the document shifting during the first-load handoff.

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
