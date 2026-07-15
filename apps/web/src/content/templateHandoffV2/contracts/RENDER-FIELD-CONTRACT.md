# Render field contract

Composition fields and UI components are not interchangeable.

## Personalized transit detail

| Field | Component | Cardinality |
|---|---|---:|
| `editorialHeadline` | optional eyebrow/headline | 0–1 |
| `factualEventTitle` | page title | 1 |
| `timingDisplay` + duration/exact date | timing row directly below title | 1 |
| `compactSummary` | card only; optional short TLDR if product retains one | 0–1 |
| `expandedNarrative` | main body/Overview | 1 |
| `practicalResponse` | body continuation or distinct guidance section | 0–1 |
| `passContext` | Long-term/pass section | 0–1 |
| `astroFooter` | final technical footer | 1 |

The full expanded narrative must never appear in the centered hero/TLDR and then repeat under Overview. If the existing page requires an Overview heading, Overview owns `expandedNarrative`; the hero may own only `compactSummary`. The Long-term section owns only `passContext`, not the entire article.

## Compact versus expanded

- Compact is one self-contained card-scale claim.
- Expanded develops the lived situation.
- Compact may be derived from the same reviewed source, but it must not equal or truncate the first N characters of expanded copy.
- Cards never render technical footers.

## Shared invariants

- Dates appear in timing UI. Narrative may discuss recurrence or pacing, but may not restate dates merely to fill a slot.
- Technical footers render once and last where the contract calls for them.
- A normalized sentence may not appear twice on one route.
- Optional headings disappear when their fields are empty.
- Empty fields do not trigger emergency prose.
- Initial load and hydrated load must resolve the same template, record, fields, and final copy.

## Admin preview

Admin must preview the exact field-to-component mapping used by the reader. A raw source row is evidence, not a preview. Preview must display template family/version, surface, fact ID, source tier, primary/supporting source keys, rendered fields, and provenance.

