# Illustrated loading on Sky and Friends

The reader document, Sky's initial reading, and Friends' route, account,
Circle and empty chart-list loading states use the shared illustration frame.
The existing readiness boundaries own dismissal. There is no minimum display
time and decorative downloads never control content readiness. Cached chart
rows and a revealed Sky reading remain visible during revalidation.

The active decorative loader is the `working` animation from
[Thinking Orbs](https://libraries.dev/orbs) (`thinking-orbs` 0.3.1, MIT). The
app paints that engine on its own canvas clock so the wait stays in motion:
the packaged React component waits for IntersectionObserver and freezes under
`prefers-reduced-motion`, which left Sky on a still frame. Compact waits use
the 20px preset beside the status text. The pre-JavaScript document shell,
including Content Studio, uses a CSS orb in the same frame until React mounts
the canvas.

The rotating PNG sequence remains a sunset option. Set
`localStorage.tldrastro:loadingVisual` to `artwork` to restore it as the
default loader alternative. Fourteen supplied illustrations retain the original
linework and alpha channel, including enclosed interiors. The 512px PNGs were
cropped from the owner's Colorful Constellations Zodiac Signs pattern PNGs,
with motifs crossing the seamless pattern boundary joined before centering. The
zodiac figures use pattern 4 (SHA-256
`860eaf022334a7e50b10559710fb9e86f1a4c064f6f1e2d2d0e98adf0f7c6713`);
the Sun and Moon use pattern 2 (SHA-256
`dcc5020841940e5ba5dbb331ee89efe052704be014375e565dc89984c45b3cc3`). Original source files remain separate from the
application. No generative redraw or white fill is included. In artwork mode,
black linework is inverted in the dark theme. After React mounts, one next
illustration downloads every 2.2 seconds and crossfades only after decoding. A
failed next image retains the previous image or the Thinking Orb backup.

Loading status frames sit directly on the page background, without a card
surface or border. Their spacing, illustration size, and readiness behavior
remain shared across the reader, Friends, and Content Studio.

Leaving Sky does not reset placement sources to idle. Returning to a revealed
reading must not replay the full-page loader. Calendar, You, and Friends chunks
preload on navigation intent so a later visit can mount without waiting for a
fresh download.

The startup root contains the initial card's margins before the app's lazy CSS
arrives. This prevents the document shifting during the first-load handoff.

Verification from a fresh build:

```sh
npm run test:content-studio-api
npm run qa:css-audit
npx playwright test -c playwright.config.ts --workers=1 tests/visual/loading-illustration.spec.ts tests/visual/sky-loading-layout.spec.ts tests/visual/app-loading-feedback.spec.ts
npm run qa:friends-loading-matrix
```

The focused browser regression covers Sky and Friends, light/dark, desktop/phone,
stationary frame bounds, reduced motion, the sunset artwork option, transparent
interiors, dismissal, reload, returning from Calendar without a replayed loader,
and keeping a revealed reading during refresh. The existing Friends matrix
protects cached chart visibility and all performance budgets. Existing Sky
regressions protect copy, publication and layout behavior.
