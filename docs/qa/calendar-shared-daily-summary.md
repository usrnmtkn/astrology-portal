# Calendar Sun introduction and Moon reading

Implementation base: `caaa140fb`, branch `codex/calendar-day-template`.
Owner approved this layout for merge and production deployment after reviewing
the Sun-to-Moon paragraph spacing. The release uses the main-branch Git deployment.
No source-row copy edits or publication-state changes are included.

The current scope follows the owner's simplified layout: the shared Sun
sentence, the complete Moon reading, then the existing Exact today paragraphs.
The Sun and Moon share normal paragraph spacing within one introduction.
The live aspect selection, order, paragraph treatment, void-of-course card,
and Sky movements buttons are unchanged from the implementation base.
There is no added daily overview, aspect-count block, individual aspect
heading, or standalone Moon sign-and-degree header.

The Sun introduction reuses `cms/sky-daily-summary/sun/{sign}` and the existing
`cms/sky-daily-summary/assembly/sunOnly` sentence template. The assembler's
`openingOnly` option selects this complete sentence without applying the full
Sky paragraph layout. No new content keys, copy bank, or Studio layout control
are added. The Sun's sign, degree, and link come from the selected Sky snapshot;
Calendar rejects snapshots for a different local date or location. Today uses
the existing live Sky clock; historical dates use the selected date reference.

The regular Moon passage uses the complete existing
`fallback-hook/sky-placement-lived/moon/{sign}` unit. Existing dated Calendar
Moon guidance remains the fallback and continues serving Week and lunation
contexts. Protected prose, source hashes, and publication state are unchanged.
The Moon reading starts with the passage itself. Phase titles, season context,
and polarity milestones retain their existing sources.

Content Studio's Calendar workspace links to **Edit Sun summary** in the single
**Sky Write-ups → Daily Sky Summary** editor and **Edit Moon placement writing**
in the existing source-row editor. The Sun source can be selected with
**Summary section → Sun summaries** and **Search summary wording → Virgo**.

Verification for the simplified scope:

- Shared summary suite: complete Sun-source parity, calculated degree link,
  date/location validation, empty data, full-layout isolation, and draft gating;
  existing Sky composition, grammar, publication, and source-bank regressions.
- Calendar package boundary and web typecheck.
- CSS/token audits.
- Fresh-build reader tests across desktop/mobile and light/dark themes, with
  populated and empty aspect days: complete Moon paragraphs, Sun-first order,
  original aspect order and paragraph structure, original movement buttons,
  matching body typography, no extra headers/counts, and Sun article navigation.
- Existing shared Studio edit path on desktop and mobile.
- Standalone admin build and the unchanged admin bundle budget.
