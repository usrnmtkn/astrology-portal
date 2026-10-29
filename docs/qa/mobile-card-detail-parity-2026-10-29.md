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
- Aspect and house glyphs are centered. House metadata names the house, and
  friend/synastry orb metadata keeps degree/minute precision. Friends controls
  and chart legends use UI typography. Explore signs defines its own stacked
  glyph/label layout rather than depending on a lazy Learn stylesheet.

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

Complete API/content release gates, final-main integration and deployed-main
verification remain required before this candidate may be called live. Existing
held Calendar, outer transit ring and personal Key dates candidates are separate
and are not claimed shipped by this repair. Physical iPhone Safari behavior is
not established by desktop WebKit alone.
