# Guide publication dates — October 31, 2026

Initial local verification used `codex/guide-publish-date-20261031`, based on
`de00030c2c3a95b9b2a7213f684442e66b0a98d6`. Release preparation brought the
branch up to `5a9de6cdddbd3b890a5a76ff899d43ddcdac91a2` without source
conflicts. The results below record the initial local acceptance evidence;
the release pull request records exact-head CI and deployment results.

Implementation fingerprint:
`a43ce2b7dc5c2dbc405edeaa65247e1cafe62a6a3bfb7a8f415edfe5a17fbf8b`.
This is SHA-256 of sorted modified/new source and test paths, each followed by
NUL, its complete bytes and NUL. Documentation is excluded.

## Behavior

The standalone guide/article editor offers a publish date and time in its
displayed time zone. Blank publishes immediately, past dates backdate the
piece, and future dates use Save & schedule. Save draft retains private changes.
Scheduled publications have their own badge and collection filter. Clearing the
date and explicitly publishing releases a scheduled guide immediately.

The public handler checks the release instant on every request, including
collection, key, ID and surface queries. An approved scheduled guide becomes
available on the next request at or after that instant. This requires no cron
or later publication write. Existing open collections refresh on navigation or
reload. Retiring a guide still prevents access after its release date.

Publication dates determine collection ordering and appear on covers and the
complete reading. The saved editing time zone preserves the displayed day
across reader zones. Ordinary revisions retain the original publication date.
Saving a revision leaves the current public version intact; publishing a future
revision hides that guide until its release time.

The existing sections JSON stores the public date/time-zone fields. No schema,
dependency, owner wording, approval policy or production content was changed.
Private sibling fields are stripped by the reader projection.

## Acceptance evidence

| Criterion | Result |
| --- | --- |
| Discover date field in new and existing guides | Passed: rendered Studio creation, save, reopen and reload. |
| Save without publishing | Passed: actual handler retains the date while the guide stays private. |
| Schedule with the correct local-to-UTC conversion | Passed: Tokyo/mobile and New York/desktop, light and dark. |
| Prevent early access | Passed: actual collection, exact key, ID and surface queries; rendered direct link is unavailable. |
| Release automatically at the selected instant | Passed: actual handler at one millisecond before and exactly at the timestamp, without another write. |
| Backdate and order by publication date | Passed: older newly edited guide remains behind a later publication; complete body retained. |
| Preserve displayed day in another reader zone | Passed: Tokyo-authored date rendered unchanged in Los Angeles. |
| Preserve ordinary revision dates and public copy | Passed: actual handler saves/publishes separate revisions without changing the original date. |
| Preserve legacy structured sections | Passed: default publication dates retain the complete existing section array; the final focused handler/SQL regression and server typecheck pass. |
| Clear a schedule and release immediately | Passed: actual saved revision and publication, complete reader response. |
| Reject malformed dates and zones before writing | Passed: impossible calendar date and invalid time zone return 400; saved row retained. |
| Retain conflicts, privacy, retirement and error recovery | Passed: existing actual-handler regression and complete 21-case browser suite. |
| Responsive display and shared design tokens | Passed: 390/1440 px in both themes; screenshots reviewed and CSS audits pass. |
| Production behavior during initial verification | Unverified at this stage: local fixtures did not mutate owner content. Release verification is recorded separately on the pull request. |

## Validation

- `node --import tsx scripts/test-article-library.mts`: passed, including actual
  handler and PostgreSQL publication boundaries.
- Fresh-build `tests/visual/article-library.spec.ts`: all 21 Chromium cases
  passed with a new preview (`reuseExistingServer: false`). Synthetic isolated
  storage uses the real handlers; this does not establish production mutations.
- Admin, web and server typechecks: passed.
- `npm run qa:css-audit`: passed.
- `npm run qa:admin-bundle`: passed. The final display-string adjustment was
  rebuilt and remeasured separately with `npm run build:admin` and the same
  bundle checker; both passed.
- `npm run qa:bundle`: passed on the final browser build.
- `git diff --check`: passed.
- Unfiltered `npm run test:content-studio-api`: passed (exit 0), with both
  required protected fixture stores provisioned. No assertions were waived.

The first broad API attempt lacked the protected ingress fixture store. A later
attempt reached an unrelated report test that also requires protected evidence.
The final run supplies both existing stores through the supported environment
variables and permits local test IPC. No protected bodies were copied into Git,
browser assets or logs, and no test assertions were weakened. The previously
failing report check passes with its required fixture provisioned.

During initial local verification, both bundle limits were unchanged. That
standalone admin startup measured
818,351 bytes raw / 237,589 gzip, with 863,781 aggregate JavaScript gzip bytes.
Raw entry headroom was 49 bytes and aggregate headroom was 319 bytes against
the initial base's caps. Release checks remeasure against the current main
baseline and retain the exact PR head and production deployment provenance.

Local screenshots are under `test-results/guide-publish-date-*` and
`test-results/guide-publish-date-reader-*`. Final browser, API, bundle and CSS
logs are retained in `/private/tmp/guide-publish-*` on this machine.

## Release configuration and bundle boundary

The first release matrix passed all 21 Article/Guide browser journeys but its
final Studio bundle check failed. Reproducing CI's public Supabase URL and
anonymous-key placeholders measured 819,427 raw / 237,943 gzip startup bytes,
and 868,121 aggregate gzip bytes. The earlier empty-configuration measurement
did not establish that this configuration fit the release limits.

The date field now loads with the existing deferred editor group, and
publication confirmation formatting loads with revision publication helpers.
Repeated imports use one shared loader. Publication helpers load before the
corresponding writes; pending-status recovery loads them before changing its
local recovery state. Reader wording, publication approval and conflict rules
are preserved. The date validator still requires an exact, four-digit-year UTC
timestamp, with calendar, precision, offset and year-boundary regressions.

The revised anonymous build fits those original limits, but the auth-enabled
configuration exceeded the aggregate cap by 43 bytes. Independent current-main
and feature builds, each with its own `npm ci` dependencies, establish the
requested feature cost in both configurations:

| Configuration | Main startup raw / gzip | Feature startup raw / gzip | Main / feature aggregate gzip |
| --- | --- | --- | --- |
| Anonymous fixture | 817,794 / 237,409 | 817,841 / 237,440 | 867,501 / 868,055 |
| Publishable fixture key, natal-aspect flag | 817,804 / 237,435 | 817,851 / 237,434 | 867,601 / 868,143 |

Main is `1d291ba4b82a81e0e6fd0a2cfbb8efad64584dda`; the tested runtime is
`54d8f3963362401e8b1a064eaad790c1f9caf486`. Both use native Node 22.20.0,
identical lockfiles, and the same synthetic Supabase settings. The requested
feature adds 47 raw startup bytes and 542–554 aggregate gzip bytes. A scoped
600-byte aggregate allocation raises its cap from 868,100 to 868,700, leaving
557–645 aggregate bytes. Startup raw/gzip, largest-chunk, memory graph, reader,
lazy-boundary, privacy and runtime checks retain their existing limits. This
records feature cost, not a performance improvement.

All 35 focused fresh-build browser cases passed on the final runtime: 22
Article/Guide journeys, eight article-memory cases and five publication-recovery
cases. The failed-date-panel case preserves complete draft text and its saved
schedule. The complete local API suite passed on the exact runtime commit in
772 seconds with a clean, unchanged checkout. The release PR records the final
budget-only commit, complete exact-head hosted gates and deployment results.

Runtime/test fingerprint before the release-budget allocation:
`26c2357c5474f8fea65d7ec1e961b7d3c181627ed64acbc8be407b6eeaeb0fa4`.

Complete source/test/configuration fingerprint including that allocation:
`e56b05da01885e85f8d4f5d7dee784e6c1dae7ba66968f17b23cf03174a71501`.
