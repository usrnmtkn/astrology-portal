# Sky Calendar meaning components v1

Status: `PENDING OWNER`. Nothing in this review set is approved or serving.

This set implements the owner architecture decision of 2026-08-14:

- astrology sources govern meaning;
- reader logic governs prose order;
- components may not be emitted verbatim as whole sentences;
- the first sentence must compose both positions into one shared condition;
- Forecast and Details both follow what may happen, why it matters, why it sticks or moves, and what can move.

## Contents

- `sky-calendar-meaning-components-v1.json`: 174 governed draft components with evidence pointers and hashes.
- Owner-review workbook: `outputs/sky-calendar-meaning-components-2026-08-14/sky-calendar-meaning-components-owner-review.xlsx`.

Counts:

- 144 sign units
- 5 aspect mechanisms
- 9 ordered modality pairs
- 16 ordered element pairs

All 174 rows fail closed until exact owner approval.

The frame-uniqueness gate is implemented in `scripts/sky-calendar-frame-uniqueness.mjs` and permanently tested by `scripts/test-sky-calendar-frame-uniqueness.mjs`.
