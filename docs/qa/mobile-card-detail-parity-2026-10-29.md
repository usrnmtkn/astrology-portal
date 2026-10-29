# Mobile card/detail parity repair, October 29, 2026

This candidate addresses missing planetary countdowns, the relationship-card
opening mismatch, and mobile controls shown in the owner's October 29 review.
It is not a full-site or production release signoff.

## Result

- Sky and planetary horoscope cards share one remaining-time adapter, based on
  calculated continuous visits and verified station boundaries in the selected
  location's time zone. Separate Rx and placement countdowns remain distinct.
  Lunar nodes and Lilith follow Sky's existing background-motion display policy.
- Between You Two opens with the same complete admitted relationship opening
  and context as its card. The complete independent personal-transit source is
  preserved under a separate Personal transit heading. No source copy,
  eligibility, approval, publication or retirement rules change.
- Saved and own birth forms use the shared modal shell, visible close controls,
  scrollable bodies and fixed submit actions. Native date/time fields fit their
  columns; labels and controls use UI typography. Connection explanations use
  the same shell and retain their complete facts.
- Saved-chart deletion uses the shared confirmation shell, retains its existing
  removal callback and pending guards, and returns Cancel focus to the chart's
  menu trigger explicitly, including in WebKit. Legacy dialog-only styles and
  hidden form titles were removed; the shared shell owns the visible title.
- Aspect and house glyphs are centered. House metadata names the house, and
  friend/synastry orb metadata keeps degree/minute precision. Friends controls
  and chart legends use UI typography. Explore signs defines its own stacked
  glyph/label layout rather than depending on a lazy Learn stylesheet.
- Header Moon/Sun actions use a centered 24px icon in the existing 48/56px
  controls, including Reports. Friction & Flow transit and person links retain
  their selected friend/day dialog as a same-origin return URL. Normal Back
  keeps using browser history; reopened articles without entry state restore
  that exact dialog. Invalid or external return URLs are ignored.
- Friends chooses its four house cards after validating available reader detail
  and house numbers. Earlier unavailable placements cannot consume all slots
  and hide the section. Unknown birth times still omit house context.
- The shared sextile cue uses the handoff's six-stroke `⚹` aspect symbol instead
  of the filled `✶` star, including card badges and article headers. Browser
  assertions and focused mobile screenshots confirm both rendered variants.
- Full Moon and New Moon article eyebrows retain their supplied lunar glyph
  instead of parsing the phase name as an unknown planet and displaying its
  first letter. Ordinary planet and unknown-body parsing remain unchanged.
  Exact phase names bypass the planet parser and use the existing supplied-icon
  fallback. Rendered coverage includes both phases, whitespace variants, the
  sextile header, ordinary planets and retrogrades, empty fields, and unknown
  names including Moonstone and Full Moon Watcher.
- Personal transit articles on You and Friends use whitespace above the main
  reading and before its calculated context, without horizontal rules. Complete
  paragraphs, dates and the return path to the selected forecast stay intact.

## Validation and scope

The isolated checkout has its own locked dependencies and a local knowledge
build. Web typecheck, shared CSS/token audits, reader-facing content contracts,
complete-detail copy integrity, connection separation and friend transit
provenance checks pass. Actual ephemeris regressions cover all 14 supported
planets/points across two time zones and three dates, including direct and
retrograde visits, a return visit, DST, midnight and year boundaries.

Fresh-build browser checks use synthetic profiles and block unexpected external
HTTP/WebSocket traffic. Coverage includes Chromium at 390/1440px and WebKit at
390px in both themes, plus 320px Chromium and 430px WebKit. Assertions cover
card/detail opening parity, source replacement/retirement, navigation/reload,
countdown agreement, close/focus behavior, form submission, scrolling, contrast,
centered glyphs and sign-grid layout. Rendered screenshots are reviewed locally;
original owner screenshots and their personal data are not published.
The 23 existing modal handoff cases also pass, including short viewports,
scrolling, focus trapping, backdrop behavior, swipe behavior and reduced motion.
Existing compact timing formatters moved unchanged into the shared timing module;
event-date consistency checks retain their midnight and DST assertions.

The added navigation checks pass for both reader/friend personal articles and
connected-friend handle routes, app Back, browser Back, reload and missing entry
state. Both feed URL formats restore the selected dialog, and closing it returns
focus to its day tile. Sixteen return-journey cases pass across the same eight
browser configurations. Ten forecast/Reports browser cases pass; the eight-case
mobile/theme matrix also passes. Reports icon checks include 320/390/1440px in
both themes. One earlier icon test asserted raw floating-point bounds as an
integer and was corrected to verify exact CSS dimensions and subpixel tolerance;
the failed run is retained locally. Routing validation and CSS/token audits pass.

House-selection checks reproduce the missing Friends section with calculated
Sagittarius-rising fixtures, where the first four placements have no admitted
detail. All eight browser configurations now show four available house readings,
open their matching article, retain the section after Back/reload, and omit it
after the same synthetic chart changes to an unknown birth time. The You house
section remains visible for the known-time profile. A source/calculation audit
also covers all twelve rising signs. Unit, render and provenance checks pass.
An earlier matrix completed its assertions but reported a pending font request
during teardown; the test now waits for font readiness, and the fresh rerun exits
cleanly. Mobile light/dark house-card screenshots were inspected locally.

The required browser release gate includes a mobile-parity job running the
countdown, return-URL and house-selection boundary regressions and 48 browser
cases across all eight viewport/theme/browser configurations.
Workflow syntax, affected-surface selection, suite coverage and aggregate gate
regressions pass locally. The complete connection source suite also remains in
its existing required job.

The focused mobile follow-up passes both the icon-header case and the combined
theme/forms case after a fresh build. Visual inspection found an inherited
alignment rule that left a planetary glyph tile at the card edge; its scoped
story-card layout now centers the tile and its grid track. The regression checks
both tile-to-card and glyph-to-tile alignment. Development matrix 43 completed
48/48 with no retries on `2417bbf9`, rebased onto main `a8e89c62`. A later owner
request removed the transit paragraph rules; its own/friend journey assertions
and the subsequent source cleanup still require a fresh rendered rerun. Matrix
43 is not acceptance evidence for these later changes. One earlier harness build failed before
rendering because of a Node-only Swiss Ephemeris import; the browser harness now
externalizes that built-in module, matching the existing browser fixtures.

The first rerun (53) could not start its localhost preview inside the restricted
sandbox and ran no browser assertions. Run 54 used the approved localhost
permission and stopped after one pass and one failure: a Friends handle article
carried calculated transit context but no compact-header flag, so its rule
remained visible. The repaired presentation contract recognizes that existing
personal context as well; ordinary Sky articles retain their separate layout.
The strict own/friend divider assertions remain in place, and a fresh rerun is
required. Logs, screenshot and trace from the failed run are retained locally.
Matched independent builds of main `a8e89c62` and source build 52 use the same
native Node 22.20.0 and synthetic preview environment. Candidate startup JS is
396,860 gzip bytes versus 396,331 on main; the deferred horoscope reader is
5,605 versus 5,311. They exceed the current ceilings by 10 and 5 bytes. Shared
Studio CSS is unchanged at 31,799 bytes. Reader startup CSS drops by 207 bytes
and aggregate CSS by 267 bytes. Every other measured graph/chunk budget passes.
The reviewed feature allocation adds only 50 bytes to each of those two ceilings,
to 396,900 and 5,650, leaving 40 and 45 bytes above the measured candidate.
This records a feature cost, not a loading improvement. All other graph,
payload, source and runtime limits remain unchanged.
Birth inputs retain 16px text and theme icons retain 24px through existing tokens.
After the Friends handle variant repair, source build 55 measures the deferred
Sky detail at 6,827 bytes, two bytes over its unchanged 6,825 ceiling. That small
measured cost remains under review; other bundle limits pass.

Complete API/content release gates, final-main integration and deployed-main
verification remain required before this candidate may be called live. Existing
held Calendar, outer transit ring and personal Key dates candidates are separate
and are not claimed shipped by this repair. Physical iPhone Safari behavior is
not established by desktop WebKit alone.
