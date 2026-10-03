# Content Studio retrieval recovery

The October 3, 2026 investigation reproduced three independent causes of the
owner's missing-source, timeout, and Inactive-status reports:

- Production did not have `generated_interpretations.studio_facts`. Inventory
  requests first failed with a missing-column response, then repeated without
  the metadata needed for classification. Detail reads unnecessarily requested
  the same listing-only column.
- Personal Transits previews fetched the entire live core provider with
  `select=*`, in 1,000-row pages. Production logs showed 20 statement timeouts
  for that query between 15:20 and 15:45 UTC. This competed with Studio reads.
- Live-status comparison normalized an empty Friend field on only one side.
  Identical published Moon content consequently appeared Inactive.

The inventory migration was applied to production on October 3 (migration
receipt `20261003160603`, `generated_content_studio_listing_facts`) with a two-second
lock-acquisition limit and a 30-second statement limit. Its generated column
preserves document fields and `updated_at`; the three Moon/Cancer timestamps
were unchanged after the repair. The projection function is security invoker
with a pinned empty search path. No publication, review, or authored-copy update
was part of the repair. The migration remains idempotent for other environments.

Detail reads now use only document columns. Personal Transits storage queries
use indexed content-key ranges for every potential source of the selected
contact, including new exact sources, mirrored pairs, shared cards, inserts,
hooks, templates, vocabulary, and publication records. The shipped reader still
selects the prose. Default supplemental review loading imports the legacy
calculation handler only when an explicit request needs it.

Regression coverage:

- `test-content-live-status.mts`: actual handler with empty, whitespace, null,
  and absent Friend fields; exact live revision stays Live.
- `test-content-studio-storage-reliability.mjs`: one indexed detail read,
  complete saved document, no listing-column dependency, storage failure.
- `test-transit-natal-preview-api.mts`: actual query-filtered handler, unrelated
  records excluded, published overlays and retirements retained; scope includes
  selected sources for 1,216 supported transit contacts.
- `test-studio-listing-facts.mjs`: execute the migration in PostgreSQL twice,
  preserve full copy and timestamps, validate generated metadata and refresh.
- `sky-placement-composition.spec.ts --grep Moon`: loading and failed-read retry.
- `sky-moon-publication-reader.spec.ts`: mobile/desktop, light/dark, complete
  section discovery, real-handler isolated save/publication/reload, Live status
  with empty Friend fields, and complete rendered reader paragraphs.

Release evidence belongs to the PR's exact tested head. Production acceptance
must separately verify the main deployment revision and read-only loading of
the owner's three Moon/Cancer sections. Do not save synthetic content in
production to obtain that evidence.

## Published Moon reader regression

A follow-up reproduced a separate presentation failure on
`/#sky/placement/moon/cancer`: the header and aspects rendered, but the complete
published article was absent. The Moon renderer had resolved its three governed
sources. A subsequent unsupported V4 Moon article lookup threw `NOT_RELEASED`;
the caller incorrectly treated the published Moon opening as a withheld V4
article and discarded the valid reading.

The V4 publication guard now applies only to its article family. Moon continues
to use the opening/lived/turn renderer and each source's existing exact-version
publication checks. This does not change source prose, publication state, the
resolver package, or calculation facts.

The extended Moon browser flow failed before the change with no article body.
It now follows Studio Save & publish through the actual isolated reader handler
and the built web App. It asserts every paragraph in order, reloads the route,
and separately covers retirement of the opening, middle, and ending across the
four viewport/theme cases. It runs with the web reader CI suite rather than the
standalone admin preview. The canonical Sun publication hydration regression
also retains its no-stale-copy and retirement assertions.
