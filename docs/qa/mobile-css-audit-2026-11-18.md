# Mobile CSS audit — November 18, 2026

Reference: the owner's 36 supplied iPhone screenshots in chat
`01a1f0b2-03da-78f0-8116-15aa02194130`.
Base: `c472d234956ed39b592d98183ca2485cc0288f48`.
Implementation: isolated branch `codex/mobile-ui-css-qa-20261118`.
This is a local implementation and acceptance record, not a production release.
Original screenshots remain outside the repository. Browser fixtures use synthetic people and readings.

## Findings and changes

| Priority | Finding | Resolution |
| --- | --- | --- |
| P1 | Scrolled text remains visible between the floating navigation controls, reducing separation and legibility. | Add a theme-backed background fade behind the scrolled header. Keep Back above that background; preserve its position and hit area. |
| P1 | Menu height uses the small viewport, so Safari can expose the page below it when its browser bars retract. | Use the dynamic viewport height, full mobile width, square viewport edges, safe-area padding, and contained scrolling. |
| P1 | Sign-up and navigation close glyphs are small within their buttons. Browser button padding is also inherited. | Explicit zero padding and 48px controls for sign-up/menu; shared 24px close SVGs also cover reading dialogs, birth forms, date sheets and legacy chart overlays. |
| P2 | Child pages hide the entire wordmark at phone widths. | Retain `TLDR` beside the Home glyph at 390px; hide only the `Astro` suffix. At 320px the Home glyph remains available. |
| P2 | Home and profile SVGs are smaller than neighboring menu and Back controls. | Use the shared 24px icon size. |
| P2 | Long transit section headings compete with the See all control. | Permit the section header to wrap the control onto its own row. |
| P2 | Long profile names can crowd a menu's close control and theme selector. | Wrap names, preserve the avatar's size, and allow the theme row to wrap. |
| P1 | WebKit paints transit chart glyphs black even though computed CSS reports a light-color filter. | Replace CSS color-function tinting on planet images with native SVG alpha tinting. Bind flood colors directly to the existing chart roles, and retain resolved tint colors in SVG/PNG/PDF export. Verify actual painted pixels before and after a theme switch. |
| P2 investigated | Tables extend beyond the phone width. | Preserve deliberate scrolling inside the aspect grid and position tables; check that the page and chart remain within the viewport. |

Typography retains the established Newsreader reading/display roles and system UI
control roles. Complete reading bodies are preserved. No source prose, calculation,
content selection, or account data changes are part of this patch.

The browser comparison reproduced a rendering difference consistent with the
[WebKit SVG filter issue](https://bugs.webkit.org/show_bug.cgi?id=246106).
The regression checks actual glyph pixels; a correct computed `filter` value
passed while the glyph was still black. Native SVG tinting fixed the initial
paint. Binding `flood-color` directly to the theme role also fixed repainting
when switching themes. The light-mode pixel threshold accounts for antialiasing
at phone scale while rejecting the previous white glyph on a light wheel.

## Every supplied screen

“Shared fix” identifies a presentation change in this patch. “Verify” identifies
an existing behavior to exercise against current source; it does not assert that
the screenshot's older state is already fixed in production.

| Screenshot | Surface and theme | Finding / disposition |
| --- | --- | --- |
| IMG_2057 | Sky chart download options, light | Verify responsive toolbar, select widths, readable metadata and complete chart containment. |
| IMG_2058 | Downloaded chart PDF, light | Static export reference. Preserve the export layout; mobile page CSS does not style the PDF viewer. |
| IMG_2059 | Expanded Sky chart, light | Verify chart scale, toolbar alignment, and chart labels within the viewport. |
| IMG_2061 | Create account, light | Shared fix: visible 24px close glyph in a 48px button; verify fields and password affordance. |
| IMG_2062 | You report actions and transit section, light | Shared fix: scrolled navigation separation and wrapping section header. Preserve both report actions. |
| IMG_2063 | Navigation menu, light | Shared fix: viewport coverage, close icon, safe areas and contained scroll. |
| IMG_2064 | Personal transit Key dates, light | Shared fix: navigation background. Verify expanded dates, metadata wrapping and collapse control. |
| IMG_2065 | Personal transit Key dates while scrolling, light | Same shared navigation fix; verify all date rows remain accessible. |
| IMG_2066 2 | Transit chart aspect grid, light | Verify intentional horizontal scrolling stays inside the grid, with a stable row-label column. |
| IMG_2067 2 | Scrolled aspect grid, light | Verify horizontal position, row alignment, and accessible detail selection. |
| IMG_2068 2 | Aspect grid footer, light | Verify footer text and legend wrapping. Native text selection is preserved. |
| IMG_2069 2 | Transit chart download options, light | Verify toolbar, responsive download fields, and chart scale. |
| IMG_2070 | Personal transit detail with tags, light | Shared fix: visible TLDR Home label and scrolled navigation. Verify title, timing, tags and body hierarchy. |
| IMG_2071 | Personal transit Key dates, light | Shared fix: navigation separation. Verify date-label and description columns. |
| IMG_2072 | Personal Mercury transit detail, light | Shared fix: child Home label and larger Home glyph. Preserve complete narrative and tag wrapping. |
| IMG_2073 | You house-transit cards, light | Shared fix: scrolling header background. Verify centered glyph, house badge and complete detail access. |
| IMG_2074 | Personal Moon transit detail, light | Shared fix: child Home label and navigation separation. Verify Back, body measure and Key dates. |
| IMG_2075 | Personal Mercury series detail, light | Shared fix: child Home label. Verify date range, body, and expanded Key dates. |
| IMG_2076 | Behind this forecast, light | Shared fix: navigation background. Duplicate-looking responsibility rows are a content/data question; this patch does not remove source units. |
| IMG_2077 | Birth information form, light | Verify fixed close/save access, field widths, date/time segments and unknown-time control. Do not save real account details during QA. |
| IMG_2078 | Navigation menu, dark | Shared fix: full viewport coverage and close icon; verify theme contrast and selected destination. |
| IMG_2079 | You transit chart, dark | Verify rendered planet images and degrees in dark mode, after switching themes, and after reload. |
| IMG_2080 | You Weekly Moon and house section, dark | Shared fix: scrolled navigation and wrapping See all header. Preserve complete reading access. |
| IMG_2081 | You house-transit card, dark | Verify glyph/badge contrast, card typography and consistent centering. |
| IMG_2082 | Enlarged house-transit view, dark | Verify page overflow at normal viewport scale. Native pinch zoom is preserved; do not disable zoom to conceal overflow. |
| IMG_2083 | Transit-date quick choices, dark | Verify tabs, sheet close, viewport containment and return focus. |
| IMG_2084 | Transit-date calendar, dark | Verify selection, month controls, Apply/Cancel access and sheet scrolling at short viewport heights. |
| IMG_2085 | Transit-date calendar with expanded browser chrome, dark | Verify the same sheet at changing viewport heights and preserve the selected date. |
| IMG_2086 | Sky chart, dark | Shared fix: larger Home glyph. Verify chart text, glyph contrast, layout and full-chart access. |
| IMG_2087 | Moon conjunction detail, dark | Shared fix: TLDR Home label. A metadata-only detail needs separate content/loading evidence; CSS must not invent a reading. |
| IMG_2088 | Moon square detail, dark | Same Home fix; retain the metadata-only content gap as unverified. |
| IMG_2089 | Related aspect reading, dark | Shared fix: navigation background. Verify readable body, metadata, Read More and section spacing. |
| IMG_2090 | Personalized reading and horoscopes, dark | Shared fix: navigation separation. Verify heading hierarchy and complete reading text. |
| IMG_2091 | Mars placement article, dark | Shared fix: child Home label. Verify dates, article body, related sections and lower-page navigation. |
| IMG_2092 | Related Mars/Venus aspect, dark | Shared fix: navigation background. Verify glyph contrast, paragraph measure and Read More access. |
| IMG_2093 | Related Mars/Sun aspect, dark | Same navigation fix; preserve the full owner-authored passage. |

## Verification record

The audit regression covers light/dark at 320, 390, 768 and 1440px in Chromium
and WebKit: full menu geometry, resize while open, final menu-item access, long
names, close SVG sizing, focus restoration, scrolled reading/Back stacking,
Home visibility, page overflow and live chart theme changes. It is registered
in the existing design-handoff CI suite.

Existing focused browser journeys cover child navigation, header overflow,
profile avatars, date controls, article typography and retrograde glyphs.
The broad local matrix passed 71 cases covering those journeys, all five chart
families, bounded grid scrolling, long/sparse transit cards and responsive
reading typography. Four additional failures were test assertions: SVG URL
quoting in exports and a minimum painted-pixel count too high for 320px WebKit
antialiasing. The corrected checks retain local-fragment and actual glyph-paint
requirements; the original failures remain recorded.

After the final shared close-icon adjustment, 27 affected rechecks passed:
16 light/dark Chromium/WebKit audit cases, six reading-dialog variants, three
form journeys (desktop, Chromium phone and WebKit phone), and two precise-chart
export cases. The two standalone relationship-export cases initially stopped
before chart access in a preview built without the synthetic auth settings;
both subsequently passed from the suite's configured fresh build. Standalone
SVG, PNG and PDF outputs retain the resolved glyph colors in both themes; the
dark PNG was visually inspected. Successful results apply only to unchanged
relevant source, dependencies and build inputs.

CSS/token audit, browser-suite coverage, web TypeScript/build, wheel rendering
and chart-report contracts pass. Source privacy scanning passed for 11,995
files; the final public asset scan passed for 460 files. Screenshots were
visually inspected for mobile and desktop navigation, both menu themes,
long names, sign-up, body typography, Back layering, and rendered dark glyphs.

Initial verification failures are retained in local logs: sandbox dependency-cache
and preview-port restrictions; an ambiguous test close-button locator; an
incomplete synthetic sign-up form; and WebKit's subpixel viewport rounding.
Visual inspection also caught the new header background covering Back before
the Back stacking fix and hit-test regression were added.

Final local outcome: all affected checks passed across the recorded broad run
and focused reruns. No product source or dependency changes followed the final build
and the affected control/export rechecks. The remaining findings below are
explicitly unverified, rather than hidden by a passing CSS test.

Release gates, deployed main acceptance, physical-iPhone browser-bar transitions,
the metadata-only aspect readings, duplicate forecast data, and PDF-viewer
presentation are separate from local CSS acceptance. No deployment or live
content write is authorized or claimed by this record.

## November 19 fullscreen icon follow-up

The owner's two-arrow reference is implemented with the existing Lucide
`Maximize2` icon ([official reference](https://lucide.dev/icons/maximize-2)).
Sky's Unicode fullscreen character and the bracket-style icons in the shared
personal-chart control and Friends chart rail now use the same 24px SVG.
The existing circular buttons, accessible labels, theme colors and actions
are retained. No dependency or CSS changes were needed for this follow-up.

Verified the uncommitted candidate on `codex/mobile-ui-css-qa-20261118`, based
on `c472d234956ed39b592d98183ca2485cc0288f48`. The refreshed `origin/main`
was `7b0ce3b2de90946ee95a6af8c41a8a2d4aa4631f` (3 behind, 0 ahead).
`npm run qa:css-audit` and `git diff --check` pass. A fresh web build and
the four existing `all five full charts` browser cases pass at 390px and
1440px in light and dark mode: Sky, personal natal/transit, and Friends
synastry/composite charts open, interact and close successfully. Trace frames
were visually inspected for the new arrows on Sky, personal and Friends
controls. Existing successful unrelated evidence was retained. This remains
local work; no commit, push, release gates or deployment were performed.
