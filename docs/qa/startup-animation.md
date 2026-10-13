# Reader startup animation

The document displays a centered celestial poster immediately. Once the entry
bundle runs, `startupAnimation.ts` loads the light SVG Lottie player as an optional,
asynchronous asset at normal script priority. It does not await the player, an
animation loop, or a minimum display time. React replacing the document shell is the readiness signal. Normal
route navigation and in-page loading keep the existing progress indicators.

The four symbols follow the owner's October 12 reference: a Sun with a center
dot and an outlined crescent above the Earth cross and a six-point star. These
are newly drawn vector paths. No Evernote or Lucide artwork is included.
The 80-pixel icon box contains 2-pixel rounded strokes. A 2.8-second loop brightens
the symbols clockwise: Sun, Moon, star, Earth. Each bounce lasts 700 ms, and the
next icon begins rising at the exact moment the previous icon returns to rest,
including Earth back to Sun. There is no preparation beat or idle interval.
Each icon lifts 3 px with a −2° tilt and stretches
vertically by about 1.5%. Landing widens it by 5% and compresses it vertically by
about 4.8%. One smaller 0.4 px rebound smoothly returns it to its original shape
as the next icon takes over. The shortened settling tail keeps the handoff brisk.
The deformation approximately preserves area. Non-scaling SVG strokes keep the
line weight at 2 px throughout the bounce. Brightness holds through takeoff and
crossfades toward the next icon during settling.

The owner's `Prototype.gif` shows a slower lift/turn, a faster drop, compression,
and rebound. Its loader is visible for about 1.35 seconds at 150 ms frame intervals;
the exact source curves cannot be recovered from that recording. The line-icon
elastic adaptation uses minimum-jerk progress, `6t^5 − 15t^4 + 10t^3`, represented
by four cubic Hermite sections per transition in the Lottie temporal handles.
Adjacent sections share endpoint velocities, and each motion reversal eases to
zero speed. This replaces the abrupt changes in speed between the earlier
takeoff, landing and rebound curves. Brightness uses the same smooth progression.
The composition runs at 60 fps with subframe interpolation; frame zero still
matches the SVG poster.

The default is monochrome ink (`#1c1f26`), with pale ink (`#eceef2`) on dark
backgrounds. The shared caption is 14 pixels, 22 pixels below the icon box,
in `#6e7685` or `#8d93a0`. `--startup-ink`, `--startup-label`, and
`--startup-paper` in the shared theme own the palette. The earlier deep teal
(`#004b45`) / mint (`#d6f0eb`) palette remains a local preview option.

To replace the artwork:

1. Replace `apps/web/src/assets/startup-celestial.json` with a self-contained vector
   Lottie export. The light SVG renderer supports shape animations, without
   expressions; avoid external images, fonts, or scripts.
2. Replace `apps/web/src/assets/startup-celestial.svg` with its static first frame,
   retaining the `startup-artwork__poster` class. The HTML plugin inlines it so
   `currentColor` follows the theme before JavaScript. Keep the same
   viewBox/aspect ratio as the JSON composition.
3. Adjust `--startup-artwork-size` in the shared theme only if needed.

Lottie stroke styles carrying the class `startup-linework__stroke` and fills with
`startup-linework__fill` use the theme's ink color. The stroke class also keeps
outlines at 2 screen pixels during elastic deformation. Exports without these
classes retain their own colors and stroke behavior.

After building, run `node scripts/preview-startup-animation.mjs`, then start the
web preview and open `/loading-preview.html`. It opens the monochrome four icons;
Moon/Four icons, Teal/Graphite, and Light/Dark controls are local comparison tools.
Use `?loader=moon` to open the compact alternative. The next production build
removes this page.

The preview initially follows the browser's reduced-motion preference. Its
Play/Pause animation button explicitly overrides that preference for this local
comparison only, for both the four symbols and the moon. The choice persists in
the preview URL (`?motion=play` or `?motion=pause`) across reloads. The production
loader uses a clockwise brightness cycle without translation or deformation
under reduced motion. This addresses the owner's report of
a static preview: the in-app browser reported reduced motion enabled.

## Compact moon alternative

`startup-moon.svg` is a 48 × 48 icon with a centered radius-15 disc, a radius-15.5
background-colored shadow clipped to the disc, and a 1.25-pixel outline. The
shadow translates from −31 to +31 pixels over 2.6 seconds, alternates back, and
loops with `cubic-bezier(.6, 0, .4, 1)`. A −1.3-second delay starts at the covered
new-moon position. The circle is full at either travel endpoint; passing through
the center covers it, creating the requested simplified phase sequence.

The outline/lit color is `#1c1f26` on light and `#eceef2` on dark. The label is
14 pixels, 22 pixels below the icon box, in `#6e7685` or `#8d93a0` respectively.
Reduced motion and error states show a static phase. The shadow matches the
page background during loading and the recovery card surface on error.

To select it for the app, set `data-loader="moon"` on `#app-startup` in
`apps/web/index.html`; omit the attribute for the current four-icon default.
The moon uses inline SVG/CSS and skips the Lottie player entirely. Both variants
use the same accessible loading text, recovery controls, and React handoff.

Reduced-motion visits use a CSS brightness cycle on the inline poster without
downloading the player. It starts before the application entry bundle arrives.
Changing the preference while loading stops Lottie at frame zero and shows this
non-spatial signal; switching back resumes the approved bounce. Hidden documents
pause Lottie playback. App mount or startup failure destroys the animation and its listeners;
player failure leaves the accessible loading text, poster, and existing recovery
controls working. The existing 12-second slow-start message and guarded recovery
for unavailable application chunks remain in place.

Verification: `startup-animation.spec.ts` exercises the built app at mobile and
desktop sizes in both themes, actual SVG motion, reduced motion, route handoff,
player download failure, and a player that remains pending after the app mounts.
`app-loading-feedback.spec.ts` retains pre-JavaScript, slow network, application
failure, and route recovery coverage.

## Local acceptance — October 12, 2026

Tested the uncommitted implementation on `codex/lottie-startup-loader`, based on
`9261ab98ec6a44fa7f379dcf522319fc8836066d`. The fresh production web build,
TypeScript check, startup performance contract, and complete CSS audit passed.

| Criterion | Result and evidence |
| --- | --- |
| Feedback before application JavaScript | Passed: four document-shell checks, 390/1440 px, light/dark. |
| Actual motion and transition to usable content | Passed: four Lottie checks verified changing SVG output, Sky content, player cleanup, and Calendar navigation without a second splash. |
| Four-symbol reference and sequence | Passed: theme colors, 80 px icon box, 14 px caption, and rendered clockwise highlights verified. |
| Elastic icon motion | Passed: clockwise timing, 3 px lift, bounded deformation, smaller 0.4 px rebound, return to rest, smooth velocity at reversals and constant 2 px outlines verified in the rendered SVG. |
| Immediate icon handoffs | Passed: rendered SVG sampled 50 ms before, at, and after each of the four handoffs. The outgoing icon finishes settling as the incoming icon starts lifting, including Earth back to Sun; no preparation or idle beat. |
| Reduced motion | Passed: no player request initially; preference changes stop at frame zero. |
| Optional player unavailable or stalled | Passed: both cases reach usable Sky content without animation-driven recovery. |
| Slow start and application failure | Passed: recovery appears after 12 seconds; application failure stops the animation and retains the poster and error controls. |
| Existing recovery and adjacent entry points | Passed: guarded entry-bundle recovery, lazy Calendar navigation, Reports and Studio document feedback. |
| Compact moon appearance and handoff | Passed: four mobile/desktop, light/dark checks verify 48 px size, 1.25 px outline, exact colors, 22 px gap, 14 px caption, 2.6 s alternating easing, real shadow motion, and usable Sky without downloading Lottie. |
| Compact moon accessibility and recovery | Passed: reduced motion stays at a static phase; failure exposes reload and matches the shadow to the error-card background. |

Twenty-three targeted Chromium checks passed across the three specs. Tests used isolated
browser storage and fixture content-service responses, plus the local calculation
fallback. The looping local preview was also visually inspected. Production
deployment and physical iOS/Safari verification have not been performed.

Preview playback follow-up: `startup-animation-preview.spec.ts` checks explicit
playback under reduced motion at 390 px light and 1440 px dark, a complete real
Lottie loop, pause/resume, playback after reload, and the moon's CSS motion.
Both preview checks passed on the same base revision, alongside the two production
reduced-motion checks and the CSS audit. The visible in-app preview was confirmed
to advance symbol opacities after selecting Play while reduced motion remained on.

## Release verification — October 12, 2026

The reviewed loader files were transferred byte-for-byte to a fresh clone of the
clean repository on `codex/continuous-celestial-loader`, based on `9261ab98e`.
The old worktree's retired-history push guard was left intact. Commit `d9b879ec`
passed all 36 checks across the complete loading-feedback and startup animation
specs after a fresh production build, plus CSS/token audit, workflow syntax,
startup performance contracts, source/staged privacy and built-asset privacy.
The existing visual-smoke workflow now includes both startup animation specs.

Matched builds of unchanged main and the loader, each with independent `npm ci`
dependencies and identical fixture environment settings, established the feature's
bundle cost. The pinned optional Lottie light player is 46,584 gzip bytes; the
conservative manifest budget includes it in startup because it is a script URL
asset, though the app never awaits it and skips it for initial reduced motion.
The complete JavaScript increase is 51,109 gzip bytes and aggregate CSS increases
788 bytes. The measured allocation and narrow hash variance allowance are recorded
in `scripts/web-bundle-budgets.json`. Main passed its prior ceilings; the loader
passes the updated feature allocation. This adds animation cost and makes no
performance-improvement claim. Required hosted checks and deployment verification
are separate from these local results.

## Live playback follow-up

The local comparison can explicitly play the full bounce with `?motion=play`,
while production follows the system motion preference. Reduced motion now keeps
the four icons signaling progress through a gentle clockwise brightness cycle,
without moving, scaling, or rotating them. The normal-motion player uses default
script priority instead of an explicit low-priority hint, and readiness
handles both the event and an already-loaded player. App readiness still never
waits for the animation.

Local verification: all 15 startup-animation browser checks passed on a fresh
production build, including real SVG frame changes, the reduced-motion signal
before the entry bundle, unchanged icon bounds, clockwise order, motion preference
changes, and normal/error handoffs. CSS/token audits and startup performance
contracts passed. The local comparison now embeds its player so playback does
not depend on another asset request.
