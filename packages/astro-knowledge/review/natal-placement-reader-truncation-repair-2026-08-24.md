# Natal placement reader truncation repair — 2026-08-24

## Incident

The natal placement resolver returned complete semantic sections, but
`natalPlacementReaderSectionCopy` retained only the first paragraph unless the
row key belonged to the special `natal-you-placement-*` Moon release. On the
Sun-in-Aquarius-in-the-9th-house page, that reduced the complete house section
to its contextual bridge and discarded the approved placement body.

No source copy was missing and no approved wording needed to change. The defect
was in the app reader boundary after resolution.

## Exposure audit

The canonical source contains 153 governed rows in the natal placement reader
families. Of those, 143 contain internal paragraph boundaries:

| Family | Rows | Multi-paragraph rows |
|---|---:|---:|
| `natal-you-placement-sign-final` | 12 | 12 |
| `natal-you-placement-house-final` | 12 | 12 |
| `placement-sign-lived` | 56 | 54 |
| `placement-house-lived` | 56 | 48 |
| `sign-lived` | 11 | 11 |
| `house-lived` | 6 | 6 |

The 24 final Moon rows already had a narrow exception that preserved their
complete text. The other 119 multi-paragraph rows were exposed to the unsafe
first-paragraph normalization and could lose everything after the first
paragraph when selected. Preview-specific shortening elsewhere in the app was
reviewed separately and remains limited to surfaces explicitly named as
previews, summaries, taglines, or compact cards.

## Repair

- Every selected natal placement section now retains all reader-facing
  paragraphs before the established presentation step flattens that semantic
  section into one visual paragraph.
- No reader copy, approval state, source row, or serving precedence changed.
- A suite-wired inventory regression covers all 153 governed rows.
- The regression is directly runnable as `npm run qa:natal-placement-truncation`
  and remains part of `npm run test:content`.
- The regression checks the source Node resolver, browser source resolver, and
  shipped `dist/tldr-content.js` against the same Sun-in-9th-house fixture.
- Browser QA asserts both the contextual opening and the protected final
  sentence, so a bridge-only page cannot pass release checks again.

## Truncation audit boundary

The remaining uses of first-paragraph or character-limited copy are attached to
explicit compact contexts such as list previews, card summaries, taglines, and
calendar previews. They do not feed the natal placement detail article. Any
future use of first-paragraph normalization on a natal placement semantic
section is prohibited by the new test.
