# Calendar month overview reader — 2026-09-16

The public Calendar month view now renders a published `slot-template/calendar/monthly-overview/v1` row using the same contextual variables as Content Studio. Empty or unpublished templates stay hidden. No reader prose is invented.

Verification: `node --import tsx scripts/test-calendar-monthly-overview-reader.mjs`, `npm run qa:css-audit`, and the month view in a fresh web preview.
