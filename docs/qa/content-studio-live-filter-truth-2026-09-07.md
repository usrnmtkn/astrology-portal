# Content Studio reader-status parity

Content Library and Calendar Aspect filters previously counted raw editorial
`status`, while badges asked the reader-status endpoint whether the particular
copy could serve. An editorial LIVE row could therefore appear in a Live filter
with a Not live badge. Exact Calendar/Sky records also entered the V3 package
comparison despite being served by the separate exact-aspect registry and
Content Studio exact-aspect selector.

The filters now share the badge loader, cache, version checks, and update
invalidation. All, Live, and Not live counts apply to the current search and
category scope. Unknown or failed checks are excluded from both truth filters
and shown explicitly; failures can retry after refreshing rows. Pending checks
show a checking message rather than a false empty result.

The status endpoint uses the actual Calendar/Sky domain registry and exact
Studio selector for `sky.aspect.*`. It compares the effective saved revision's
Body and Summary with the active exact version, or the installed approved
baseline when no eligible override exists. Pending edits, identity mismatches,
review holds, and different superseded copy are not reported as live. Import
extensions preserve plain Node ESM startup; the runtime verification follows
emitted imports rather than erased TypeScript-only dependencies.

Validation:

- All 439 materialized exact Calendar rows pass reader-status parity.
- Pending revisions, installed fallback, newer approved versions, incorrect
  identities, and held revisions have targeted regressions.
- Content Studio API and CRUD regression suite passes, including repeat saves.
- Production-style plain Node status endpoint startup passes.
- Typecheck and CSS/token audit pass.
- Browser regressions cover 1440px and 390px filters, counts and visible badges,
  unavailable-status exclusion and recovery, and the existing library flow.

No reader copy or content eligibility rules were changed. The checked-in
fallback resolver artifact remains unchanged because its behavior is unchanged.

Large catalogs stream verified matches in bounded batches and stop scheduling
checks when the search/category changes. Filter and pagination helpers now ship
with the dashboard rather than as two additional tiny chunks. Duplicate badge
validation was removed; the shared loader remains the single version check.

The knowledge build is an explicit prerequisite for both the Content Studio API
suite and CI's plain Node startup check. The new JavaScript size overrun was
resolved without increasing a budget. After rebasing onto the report changes
in main, all five browser checks, the API/CRUD suite, server startup, typecheck,
and CSS audit passed again. CI grammar checks also passed. The remaining CI
bundle failures match that updated main baseline: reader initial CSS, the Sky
detail chunk, and total JavaScript. No budget was increased by this patch.
