# Content Studio publication conflict — September 10, 2026

The Sun trine Lilith owner edit was published at 07:06:57 UTC, but Studio reported HTTP 409 and retained an old draft. Production inspection found the target LIVE and its separate proposal ARCHIVED at the same database timestamp.

Two database behaviors were missing from API tests: the updated-at trigger replaces client-generated timestamps, and publication automatically archives an exactly matching revision. The API used the client claim timestamp for cleanup and could treat trigger-completed cleanup as a stale-edit error after successful publication. Reopening a hydrated row also reused its cached copy and version.

The fix uses the timestamp returned by the database claim. If final cleanup conflicts, it recognizes only an archived published revision whose target and full sections still match the submitted proposal. Other conflicts remain errors. Reopening saved rows fetches current data; a formerly pending revision now completed by publication resolves to its target.

## Exact owner-copy repair

The owner supplied the complete replacement summary and body in Codex task `01a089dd-57dc-7882-951e-69b0888197e5` on September 10. The latest pasted wording, including its revised ending, takes precedence over the earlier screenshot.

A single conditional database update applied that exact copy to row `059ea1bd-7ff5-44dd-976a-8ea67b80a4cd`, key `sky.aspect.sun.trine.lilith`. It required the previously inspected timestamp and LIVE state, retained prior copy in `sections.ownerCopyRepairHistory`, and updated canonical `Summary`/`Body` plus display aliases. It returned at `2026-09-10 08:49:44.607582+00` with exact summary, body and canonical-body equality. The live publication points to this same row and timestamp. No other content row was edited.

Body SHA-256: `ba968612f5e36ecd2974f036894123916cb7863c7ea8f973d7a8ee62a1cf098f`.

This is a Content Studio copy repair; repository prose and bundled content are unchanged. The workflow code is not deployed yet.

## Verification

- API regressions simulate database timestamp rewriting and automatic revision completion for package and article publication; competing revision changes remain rejected.
- API CRUD/lifecycle, atomic concurrency, special mutation concurrency and revision completion tests pass.
- All 79 Content Studio browser tests pass from a fresh preview, including visible approval errors, unconfirmed responses, retry, current-version reopen, completed-revision routing, keyboard focus restoration, unsaved-edit protection and template previews.
- Typecheck, Admin build, unchanged bundle budgets and CSS/token audit pass.
