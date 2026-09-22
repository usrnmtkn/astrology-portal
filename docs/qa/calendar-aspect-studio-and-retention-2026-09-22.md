# Calendar Aspect titles, filters, and retained writing

Implemented locally on `codex/calendar-aspect-studio-labels`, based on main
`5364e3efa8bbcd369c56824fae1222d2cfffc37a`. Release authorized by the owner on
September 22. Hosted checks and deployment verification are recorded on the release PR.

## Behavior

- Five-value Calendar Aspect titles show both signs in the Studio list and editor,
  even when the stored headline is generic. Three-value titles remain generic.
- Advanced signs adds two optional sign filters. Any subset of the five selectors
  works, including reversed planet order with each sign attached to its planet.
  Filters survive reload and clear together.
- Returning to a browser tab revalidates Calendar keys without clearing loaded
  eligible writing. Returning from Sky restores the same Calendar cache.
- Failed refreshes retain eligible loaded writing. Successful refreshes replace
  requested rows and their aliases, including confirmed removals. Publication
  eligibility still filters retained rows.
- No source prose, stored headlines, publication rules, dependencies, or CSS changed.

## Reproduction and verification

The regression opens September 21, 2026 in New York, selects Moon sextile Neptune,
then holds the exact content-reader request while triggering focus/visibility
revalidation. Before the fix, the approved fixture body disappears and bundled
fallback copy replaces it while the request is held. After the fix, the card and
open detail retain the complete body throughout the held request.

The fresh-build Chromium run passed all 17 selected Calendar and Studio cases:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4318 npx playwright test \
  tests/visual/calendar-content-retention.spec.ts \
  tests/visual/content-dashboard-admin-user-flows.spec.ts \
  --project=chromium-desktop --grep 'Calendar|calendar' --workers=1
```

Coverage includes 390px/1440px, light/dark, held refresh, updated copy, HTTP 503,
confirmed removal, in-app navigation, signed titles, optional filters, reload,
clear, and an isolated actual-handler editor save/reopen. The new retention
regression is included in the Visual smoke Sky reader job.

Additional passing checks: full `test:content-studio-api`; web and admin
typechecks; Calendar Aspect helper tests (all 32 filter subsets in both orders);
reader cache rehydration and last-known-good contracts; exact Sky/Calendar routing
parity; CSS audit; workflow YAML and scope checks; and the web bundle gate.

The final build has 3,456,182 total JavaScript gzip bytes under the documented
3,456,250 cap. The Studio feature's existing 500-byte aggregate allocation also
fits this cache fix; no further limit was raised. Startup and CSS caps are unchanged.

## Broader checks that are not passing

- `npm run test:content` stops in `test-report-generation.mjs`: protected private
  report evidence is unavailable in this checkout. This was rerun outside the
  sandbox after an initial local IPC restriction.
- `test-reviewed-sky-aspect-phrasebook.mjs` expects 248 exact transit records;
  current main contains 439 JSON records.
- `test-calendar-content-hydration.mjs` reaches its old season-loader source
  assertion at line 538, which no longer matches current main's Calendar code.
  Its earlier exact-key hydration assertions pass with this change.

The latter two assertions were checked directly against `origin/main` Git objects;
the underlying Calendar source, phrasebook test, and transit records are unchanged
by this branch. These failures have not been waived or reported as passing.
