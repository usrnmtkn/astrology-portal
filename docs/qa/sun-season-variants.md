# Shared Sun passage versions

Owner scope: Calendar Day's Sun paragraph and the opening Sun paragraph in
“The sky today” only. The September 23 correction supersedes the earlier review
proposal to change ingress-day timing. Ruler motion follows the date being viewed,
not the moment the season began. Task: `01a0ce7a-c2df-7111-9698-f8700dcab1c8`.

Content Studio → Calendar Write-ups → Daily Sky → Edit Sun summaries opens the
shared editor. Select Sun sign and Version. There are twelve existing standard
entries and ten optional ruler-retrograde entries. Cancer and Leo have only the
standard version. The mapping uses the same traditional rulers as lunation facts.

Standard keys remain `cms/sky-daily-summary/sun/{sign}`. Retrograde keys add
`/ruler-retrograde`. Existing clauses retain their exact source body and assembly.
An author can instead write a complete passage with `{sunPlacement}` once; the
slot produces the linked calculated Sun/sign/degree. Retrograde templates can also
use `{rulerName}`. No new interpretive text is supplied or automatically published.

Publication selects the eligible retrograde entry only while the calculated ruler
is retrograde. Missing/unpublished/retired variants use the standard entry. A known
live entry that fails hydration follows the existing publication recovery path.
Preview source links follow the selected key. Direct Studio entry requests its
summary and debility inventory before hydrating the complete saved documents.

Unchanged: ingress timing/transition bridges, Moon writing, other overview sections,
articles, and Calendar Week/Month. The existing Sky two-sentence excerpt behavior
remains; Calendar renders the complete shared Sun passage.

Verification:
- `test-sun-season-variants.mts`: all signs, direct/Rx/direct, template integrity,
  whole source/link preservation, draft/retirement/missing-live rules, preview keys,
  Calendar agreement, and ingress preservation.
- `test-content-studio-api-roundtrip.mjs`: actual handler POST, reopen, publish,
  actual reader loader, and stale-update refusal for new variant keys.
- `sun-season-variants.spec.ts`: saved direct-entry inventory, sign/version filters,
  insert controls, reload, and both reader surfaces. Browser writes are not sent to
  production; the API lifecycle uses isolated storage.
- Existing summary/Calendar tests, full Content Studio API gate, web/admin typechecks,
  fresh browser build, CSS audit, bundle gates, and private-policy scans.

Release status and tested commit are recorded in the pull request. This document
is technical scope and verification context, not approval of reader wording.
