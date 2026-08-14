# slow-mover-era-layer-v1 implementation notes

Status: uncommitted review work. No source row, approval state, serving manifest, package version, or generated artifact changed.

## Implemented template contracts

- Added an optional `era_layer` object to the continuous-placement schema with four required fields: `frame`, `handoff`, `recurrence`, and `collective_lesson`.
- Restricted era-layer rendering to Saturn, Uranus, Neptune, Pluto, Chiron, North Node, South Node, and the combined Nodes key.
- Added year-aware engine tokens for handoff and recurrence prose without changing the existing date tokens used by serving articles.
- An incomplete era layer or missing handoff/recurrence fact range throws `SOURCE_GAP`; no partial editorial layer or substitute prose is rendered.
- Fast movers cannot accept an era layer.
- The four era components render as consecutive paragraphs with no generated heading.

## Implemented planet-education contract

- Added the row contract `fallback-hook/sky-planet-education/{planet}` with render policy `sky-placement-planet-education-v1`.
- Only a reader-eligible row with that exact policy renders.
- The block appears after the engine date range and before the sign article.
- A missing or unapproved planet row renders nothing and does not block the placement article.
- No planet-education source rows were created or approved in this job. The Saturn text exists only inside the review candidate.

## Engine verification

The engine already supplied the needed prior-sign and previous same-sign fields, so no second ephemeris calculation path was added. The renderer now exposes year-preserving versions of those verified dates to era copy.

The audit found one honest boundary: the shipped Swiss planetary file starts at 1800, while Pluto's previous Aquarius residency is earlier. The engine continues returning `null` there. No Moshier fallback, static historical date, or guessed range was introduced.

## Astronomy source for the Saturn sample

The sample's astronomy sentence uses NASA's Saturn facts page for the unaided-eye statement and the approximately 29.4-year orbit: https://science.nasa.gov/saturn/facts/

`PLANET-INTROS.md` was used only as the requested seed meaning reference. Its compatibility wording was not reused verbatim.

## Spend and state

- Billed calls: 0
- Model calls: 0
- Generated articles: 0
- Staged rows: 0
- Serving rows: 0
- Approval changes: 0

