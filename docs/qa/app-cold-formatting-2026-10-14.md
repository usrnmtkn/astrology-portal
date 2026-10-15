# Cross-app cold loading and formatting

Baseline: main `59ba7feab5eaa27bf0a2b967d3e1935f7d1df30f`.

## Reproduced defects

The shared prose, inline-text and linked-paragraph components used raw writing
as a local Suspense fallback. A cold formatter download could therefore expose
Markdown markers and temporary paragraph/list geometry on any consuming route.
The earlier Sky detail correction covered its prepared renderer only.

A direct Articles & Guides URL also loaded every library category before
revealing one requested article. A slow or failed unrelated category blocked an
otherwise available exact publication.

The baseline browser regressions fail with a raw bold marker visible while the
formatter response is withheld, and with the exact article absent while unrelated
category responses are withheld.

## Changes

Shared formatted writing now suspends to the existing owning surface's loading
boundary. Plain writing retains its exact prior rendering. The safe parser stays
lazy; the prepared Sky renderer, parser rules, source selection and saved text
are unchanged. The already-deferred report document imports the prepared safe
renderer so synchronous static rendering also retains complete formatted copy.
No new heading, style, source row, publication or calculation is introduced.

Direct article URLs read their exact key through the existing public reader
client. Library views retain all-category completeness and fail as a unit.
Selection-scoped readiness prevents a prior article's result from producing an
unavailable state while the next publication is still loading. Abort, retry,
content-update revalidation and publication admission remain active.

## Verification

`tests/visual/app-cold-formatting.spec.ts` checks actual Articles & Guides,
Astro 101 and Horoscope routes at 390 and 1440 pixels. It withholds the formatter,
records visible animation frames, then checks complete opening/final text,
emphasis and lists, plus reload. Separate cases hold unrelated category reads,
change the article selection during a pending read, and reject the formatter to
exercise navigation and explicit reload recovery. All source passages in these
tests are synthetic.

The broader release checks include article CRUD/publication/retirement, Guide,
Calendar, House Transit, published horoscope navigation, Studio formatting,
You/Friends/Calendar loading matrices, types, CSS, both reader/Admin build
budgets, privacy, full API and full content checks. Final commit results and
production acceptance belong in the release evidence; fixture timings do not
establish production speed.

Writing and DNS are outside this change. Production acceptance is read-only.

## Integrated build measurements

Independent own-npm-ci builds on Node 22.23.3 compare released main
`bf5f3181c3aecf85ed37e673473e3b26076bea5f` with candidate
`0b9190c18250ca7311f23694818afbfc53976b74`, using identical synthetic
visual-smoke settings. With natal patterns enabled, aggregate JavaScript grows
from 3,625,293 to 3,625,504 gzip bytes (+211); disabled, from 3,625,251
to 3,625,489 (+238). App and reader startup decrease by 15/17 bytes;
aggregate CSS stays at 119,040. The unchanged official checker reports only
the aggregate ceiling exceeded, by 104/89 bytes. A bounded 300-byte aggregate
allocation leaves 196 bytes over the observed maximum. Startup, CSS, individual
chunk, dependency, source-payload and runtime performance limits are unchanged.
These are build costs, not live speed measurements.
