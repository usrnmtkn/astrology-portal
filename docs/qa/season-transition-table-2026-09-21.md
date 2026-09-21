# Season transition table

Base: main `292b07e28aa9d72f5ccf44310beda5df06cf8ccc`.

Calendar Write-ups > Season transitions now shows a table with transition,
complete saved passage, publication state, saved timestamp, and a direct Edit
action. Existing season, publication, composition, and source-link navigation
remain available. Twelve rows appear initially, with Show more for the rest.
Mobile uses the shared labeled table-row layout; narrative copy is not clipped.

Inventory rows contain no writing. The workspace reads saved documents in
batches of at most 32 and prefers `sections.packageDraft.body` when present,
including an intentionally empty draft. Search uses that same saved writing.
Failed reads show a retry action and unavailable copy, never older bundled
prose. GET timeouts no longer claim an edit failed to save. This does not claim
to fix the server-side cause of a transient timeout or recover an unidentified
missing edit.

## Verification

- Admin typecheck, CSS/token audit, and unfiltered Content Studio API suite pass.
- Fresh standalone Admin build: all five season tests pass. The four existing
  Moon editor cases also pass in the targeted Lunar workspace run.
- Fresh web build: all five season tests pass on the actual `/admin/content`
  entry, covering desktop/mobile, light/dark, populated/empty views, filtering,
  complete opening/final text, formatting, draft save/reload/search, publication,
  source deep links, and failed-read retry.
- Browser writes use the actual handler with isolated storage. All `/api/**`
  requests are intercepted; no production content is written or published.
- Retry coverage preserves a saved draft whose body differs from bundled text,
  disables editing until the document loads, and verifies zero writes.
- Desktop/light and mobile/dark table screenshots visually inspected; computed
  narrative typography matches the shared body role and preserves line breaks.
- Admin and web bundle gates pass. Admin measures 740,450 raw / 215,406 gzip
  entry bytes and 727,124 aggregate gzip bytes. Only aggregate budgets increase
  by 1,500 bytes for the deferred table; startup and forbidden-payload limits
  stay unchanged. No dependency is added.
- Privacy checks pass for tracked files and both built public asset directories.

Production verification requires the main merge deployment to be Ready and the
same isolated browser suite to pass at the production URL. Its commit and
deployment evidence belong in the release report.
