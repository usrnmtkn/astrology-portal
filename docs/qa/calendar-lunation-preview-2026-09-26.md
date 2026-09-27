# Calendar lunation preview

The owner requested that the main Calendar day card show the complete Sun
summary followed by only the first paragraph of the published lunation article,
with “Read more.” This is an explicit presentation exception for the Calendar
lunation preview; the saved article and its wording remain unchanged.

`CalendarDayPanel` now starts a multi-paragraph lunation passage collapsed after
its complete opening paragraph. “Read more” expands all remaining paragraphs
from that same passage in place, and “Read less” restores the preview. No other
article or journal source is opened. The control exposes its expanded state and
the controlled body to assistive technology. Changing the selected day resets
the preview. One-paragraph passages need no disclosure, and ordinary Moon-sign
passages remain complete.

The Sun placement link and degree still come from the selected day's calculated
sky. No date, sign, degree, or reader prose is hardcoded into the component.
The shared Day panel also supplies this behavior when opened from Week/Month.

Verification:

- Isolated `npm ci`; full unfiltered Content Studio API suite passed.
- Typecheck and CSS/design-token audits passed.
- Six fresh-build browser cases passed: Full Moon on mobile/desktop in both
  themes, New Moon, and a one-paragraph article. They cover the intact Sun
  summary/link, exact opening, complete expanded ending, collapse, date changes,
  overflow and runtime errors.
- Calendar Sun-summary and lunar-source wiring regressions passed.
- The immutable general content arbiter stops at the existing bare V3
  `sun/aries` source gap, documented in
  [the evergreen-section QA record](sky-evergreen-sections-2026-09-08.md).
  Its adapter and shipped resolver are unchanged by this patch.

This patch addresses the requested main-card preview. The separate journal
event-card and Sky lunation-source discrepancies from the earlier audit remain
outside this change.
