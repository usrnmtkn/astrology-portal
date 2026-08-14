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

## Wording-layer regeneration

The owner rejected the first wording layer because 142 sign units used the same mechanical join and their manifestations were unions of reusable planet and sign lists. The evidence layer was preserved at SHA-256 `0ceb85f5897fb42238dfdd69e7b02271f87befe202f009da8659add9b9337c23`.

The regenerated wording layer has:

- zero uses of the old `expressed through` join;
- zero `details_language` values copied from `combined_position`;
- an opening-construction cap of 4, with an observed maximum of 3;
- 132 distinct two-word openings across 144 sign units: 123 used once, 6 used twice, and 3 used three times;
- a reader-manifestation reuse cap of 2, with all 432 bullets unique and an observed maximum of 1;
- a details-language reuse cap of 2, with all 144 phrases unique and an observed maximum of 1;
- a connective n-gram cap of 4, with an observed maximum of 4.

These checks run during workbook generation and are pinned by `scripts/test-sky-calendar-meaning-components.mjs`.
