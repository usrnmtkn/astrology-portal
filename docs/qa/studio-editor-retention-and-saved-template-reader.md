# Studio editor retention and saved-template delivery

The broader Content Studio audit found three editor and reader defects after
the saved-wording release:

- Aspect Pattern saves replaced text entered while the save was pending.
  Record, kind, Refresh and sidebar navigation also lacked a shared dirty guard.
- Custom Variable forms accepted changes during a pending save, then closed on
  the earlier receipt. Cancel and library navigation discarded unsaved writing.
- Compiled saved-template editions could be explicitly published but were
  filtered out of the anonymous reader. Discovery skipped their base-year keys;
  standalone articles rendered only general copy, and downstream Sky fallback
  protection could substitute different house passages.

The repairs retain the existing separate save and publish actions. Pattern
receipts advance the saved baseline without replacing newer local text. Custom
Variables keep writing controls disabled during a save and require a complete,
matching receipt before closing. Dirty and pending operations participate in
the owning workspace's navigation guard. Starting another variable uses that
same guard; a confirmed new draft starts empty, including repeated Create actions.

Saved-template and ingress editions share row validation and existing selection
rules. Exact owner approval, publication identity and version, serving state,
review holds and calculated half-open windows remain required. Equal-coverage
ingress selection keeps its previous stable order. Historical standalone access
does not make an edition active on Sky.

One approved edition supplies its complete general article, authored horoscope
introduction and twelve house passages. Standalone rendering uses its full
compiled Markdown with the existing article title displayed once. General-only
revisions retain the authored horoscope heading, introduction and companions.
Imported headings may follow natural sign order while compiled house records
follow house order; consistency compares each complete block by unique identity.

## Integrity checks

An additional regression changed both a house passage and its compiled Markdown
while retaining the old declared hash. Matching declared approval fields alone
did not detect this. The anonymous server now recomputes SHA256 before projecting
the row, using the compiler's existing payload semantics.

Existing hashes depend on object property order, which JSONB can change. The
server tries only the demonstrated shipped construction orders: stored order,
generic Studio house/aspect construction, imported horoscope construction, and
that import after source-template JSONB hydration. Every candidate retains all
properties, values and array order, including imported heading metadata. Unknown
fields are never omitted to obtain a match. Unsupported inputs fail closed.
The publication handler applies the same hash check and shared structural reader
validation before any Live or ledger write. This includes future scheduling and
due dispatch. A refused immediate publication leaves every source field, saved
version and ledger row unchanged. A refused scheduled publication preserves
source copy, liveness, prior approval and timing, and reader availability; only
the existing attention-required receipt and saved version advance.

No hash migration, stored wording change or browser crypto implementation is
introduced. The rebase preserves the authored-fallback topic policy from #1392.

## Verification boundaries

`test-sky-saved-template-reader` exercises production selection, full-copy
projection, date boundaries, format precedence and downstream fallback
protection. `test-sky-saved-template-publication` uses actual owner and anonymous
handlers with SQL publication triggers and in-memory JSONB storage. It covers
generic, imported, hydrated, natural-sign-order and revised editions, stale
versions, exact publication microseconds, retirement, private metadata and both
copy-drift refusals.

The Pattern, Custom Variable and saved-template browser specifications each
cover 390 and 1440 widths in light and dark themes. Their actual-handler fixtures
exercise navigation, delayed or malformed receipts, save/reload and complete
reader copy. Synthetic checks do not establish native production acceptance or
editorial approval.

The article-memory lifecycle fixture uses twelve distinct rising-sign identities
and the established Horoscopes section heading. Its draft and already-published
browser journeys must both pass. A separate contract gap remains open: the
generic compiler accepts a template without that section heading, while the
complete-copy reader and publication guard refuse the resulting edition. This
fixture correction does not establish support for every generic template.

The Admin build coalesces small shared leaves at 8 KB while explicitly retaining
the independent lunar, season, planetary Calendar, natal comparison, revision and
library navigation entry points. Existing startup, lazy-boundary and bundle
limits remain unchanged. Save-receipt validation retains every field check.

The broader native audit remains tracked by the canonical owner-publishing
matrix. Reports, paid generation, new personal profiles and private readings are
outside these fixtures. Release evidence must record exact-head type, build,
bundle, privacy, API, content, hosted and production checks. The 51 protected
reading drafts must remain unchanged and unpublished throughout.
