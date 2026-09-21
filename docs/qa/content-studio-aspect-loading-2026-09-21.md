# Content Studio inventory loading repair

Date: 2026-09-21. Base: `cf29be0e1`.
Branch: `codex/studio-aspect-loading-audit-20260921`.
Status: release candidate; owner authorized commit, PR checks and deployment.
No content mutation. Production verification remains a release gate.

## Reworked plan and confirmed causes

1. Distinguish the input value from its placeholder and trace the actual list request.
   `Mercury sextile Mars` was placeholder text, not an active query. The inspected
   live page eventually showed 166 aspect cards and `Connected · 10,000 rows`.
   Those are observations of the old deployed UI, not authoritative category totals.
2. Preserve section identity when changing reference/retired visibility. Calendar
   Aspects enables reference rows on entry; `studioInventoryQuery` previously
   treated that flag as a request for the entire catalog. The same early return
   discarded other sections' prefix, mode, or compatibility restrictions.
3. Follow pagination to completion. The inventory API caps pages at 80 rows, but
   the dashboard stopped after 125 requests and reported success even with a
   continuation cursor. That silently cut an unscoped catalog at 10,000 rows.
4. Cancel an obsolete initial catalog request when navigating. Previously the
   selected section's effect waited for the whole initial load to finish.
5. Verify the repaired behavior with isolated API storage, a fresh browser build,
   production-scale synthetic lists, and neighboring section/filter flows.

## Changes

- Reference/retired visibility keeps each section's existing prefixes, article
  mode, and compatibility scope. Global inventory workspaces remain global.
- Dashboard requests use the API's 80-row page size and a shared tested pager.
  The pager follows more than 125 pages, rejects malformed/repeated cursors,
  ignores responses after cancellation, and explicitly fails if its 2,000-page
  safety bound is reached. It never reports that bounded partial list complete.
  The small pager shares the existing entry bundle; no budget limits were raised.
- Authentication callbacks use the current section query. Navigation during the
  initial load cancels that load and starts the selected section. Later section
  loads reset readiness; failed section loads display `Incomplete` and can retry.
- Calendar Aspects, Sky Aspect Drafts, and the transit finder use descriptive
  search placeholders instead of example aspects that resemble selected values.
- Browser fixtures now honor inventory prefix/mode filters and the 80-row cap.
  The older Compatibility test incorrectly expected a 500-row request.

## Audit scope

The section-query regression checks 21 routes under reference, retired, and
combined visibility: Calendar Aspects; Natal Chart and Aspects; Personal and House
Transits; Sky Write-ups and both Friends transit views; Calendar Write-ups;
Articles; Astro 101; Compatibility and Composite Review; five composition/source
sections; Vocabulary; Slots; and Templates. Review Queue and global Content
Library retain their intended catalog behavior.

Source review checked the search state and placeholders in the dashboard and
Variables. No hardcoded initial aspect query was found. The separate
`generatedContentClient.readGeneratedContentRows` already rejects invalid cursors
and reports its 125-page bound as incomplete; it did not silently succeed like
the dashboard. Its explicit bound is unchanged.

## Verification

- The new section-visibility regression failed on the original Calendar Aspects
  route and passed after the query fix.
- `test-studio-inventory-pagination.mjs` exercises the actual inventory handler
  with isolated `.invalid` storage, retrieving all 10,081 synthetic rows across
  127 requests. It also checks compact projection, cursor failure, cancellation,
  the explicit safety bound, and empty inventory completion.
- Fresh web-build Playwright run: 19 passed. Includes Calendar search/clear/refresh/
  reload on desktop/mobile in light/dark, initial-load progress and retries,
  navigation during an unfinished catalog, section failure/recovery, 1,261-row
  Compatibility and 7,200-row Content Library, all primary navigation surfaces,
  route/history restoration, Sky/Articles/Compatibility filters, transit navigation,
  held Sky draft editing, and composition filters.
- Admin typecheck, Calendar aspect selector regressions, navigation and CMS
  performance contracts, and CSS/token audit passed.
- The complete `npm run test:content-studio-api` gate passed. Two existing
  Aspect Pattern checks logged sandbox listener warnings; both passed again
  outside the sandbox with no warnings.
- The standalone admin build and bundle budget passed. Repository source, built
  web assets, and built admin assets passed the protected project privacy scan.
- The same 19 browser checks passed against a new standalone-admin preview.
  The focused actual-handler pagination and CMS performance regressions also
  passed again. After incorporating current main, the small pager was kept in
  the existing entry bundle to avoid an extra chunk exceeding the total budget.

The API/browser fixtures do not write production storage or authorize any reader
copy. This is a bounded inventory/filter audit, not proof that every Studio action
is defect-free. Before release, require the exact PR head's API/CI gates, merge
through main, and verify the deployed owner inventory and late-page records.
