# Reader loading and recovery

Implementation scope: Calendar day/week/month, its check-in editor, and the
Friends cold relationship performance gate. Owner-authored passages and content
eligibility are unchanged. No database schema changes are required.

## Dependencies and completion

| Interaction | Required before use | Independent work | Completion/failure |
| --- | --- | --- | --- |
| Calendar dates | Basic calculated date facts | Detailed events, authored reading bundles, check-in indicators | Controls render as soon as basic facts are ready |
| Day/week reading | Full event facts and both authored content bundles | Journal and tags | Reading ready only after both dependencies succeed; local retry on failure |
| Check-in editor | Verified account and the selected day's complete entry (or confirmed absence) | Tag/name library, month indicators | Account verification and the entry operation each have an eight-second deadline; failed load cannot expose an empty editable record |
| Month check-in indicators | Visible date range, only date and mood columns | Private journal bodies | Optional, cancelled on range/account changes |
| Tag/name picker | Its own library | Current journal draft | Failure exposes Retry tags/names; retry never remounts the editor |
| Relationship reading | First actual compatibility card | Later enhancement | Cold content completion is a release gate, separate from loader visibility |

Calendar requests fetch one entry for the selected date. The month query fetches
only indicators for its visible days. Full history remains available in the
account journal archive and explicit export. Library pagination has stable
kind/label ordering and a deadline across all pages. Queries, saves, and label
mutations use verified-user ownership; calendar mutations also reject an account
that changed while the editor was open. There is no new browser cache of notes.

Date/account changes cancel obsolete requests. An eight-second deadline produces
a retryable error even if authentication or a transport does not settle. A save
timeout retains the draft; repeating an upsert uses the same account/date key.
Timeout does not prove a write was rejected by the server.

A direct Calendar visit starts calculation asset downloads in its worker.
Basic facts make the date grid usable; detailed calculations then
overlap prose downloads. Only full facts enter the calendar cache or select an
authored reading. Each calendar API attempt has a 2.5-second deadline before
falling back to local calculation. A slow prose bundle cannot hide the date grid. Until complete, the reading area
shows its own loading state and does not choose replacement prose. A failed asset
stays local to Calendar. Explicit retry reloads failed module imports because
browsers cache module failures. Background recovery cannot reload an open
check-in editor. A timed-out but still downloading bundle retries without reload.

## Acceptance checks

- Cold Calendar: three fresh contexts each at 390 px and 1440 px; 150 ms network
  latency, 1 MB/s download, mobile CPU slowed 2x; no natal/calendar calculation
  cache. Controls must complete within 6 seconds and visible reading within
  7.5 seconds in every sample. Remote calculation is deliberately unavailable,
  so these measure the shipped local calculation path and real static assets.
  The preview serves gzip-compressed text and calculation assets, matching the
  live server's observed encoding; the benchmark asserts that encoding.
- Selected entry recovery: a stalled request must produce an error within the
  eight-second deadline; successful retry must expose editing within 2 seconds
  with the fixture response available. A library failure cannot block editing.
- Friends: existing loading-state thresholds remain; cold relationship content
  now has a 7-second median threshold (previously measured but ungated). The
  previously recorded 5.2–6.2 seconds motivated this regression ceiling; it is
  not a claim that production relationship latency improved.
- You: existing saved-profile thresholds remain, explicitly described as cold
  browser loads with cached natal data. They are not first-time account or
  complete-reading latency measurements.
- Bundle ceilings are not raised. CSS/token, content-boundary, API, privacy,
  and affected browser checks remain required.

Run browser tests from a freshly built preview using an unused
`PLAYWRIGHT_BASE_URL` port. Never count results from an existing preview.

## Production evidence

`readerPerformance.ts` records local User Timing measures for Calendar controls,
Calendar reading readiness, selected check-in readiness, and library completion.
Successful measurements end on the next animation frame after state installation.
These begin at component/request work, not document navigation: they exclude
HTML and initial application download. The browser benchmark above includes that
startup cost. The controls metric precedes detailed event enhancement on cold visits.

Five percent of non-automated production visits send at most two batches of eight
measurements to the same-origin `/api/reader-performance` endpoint. Do Not Track
opts out. The endpoint logs only allowlisted checkpoint/outcome, integer duration,
small/large viewport, coarse network class, cache classification, and deployment
revision. Requests omit credentials; no URL, selected date, account ID, text,
birth data, friend details, or journal contents are collected. Failed or blocked
telemetry never retries or changes application behavior. No new analytics vendor,
subscription, database table, or recurring task is introduced.

Export the `reader_performance` JSON messages from runtime logs, then run:

```
node scripts/summarize-reader-performance.mjs /private/path/runtime.jsonl
```

The report separates revisions, checkpoint, viewport, network, and cache status;
it reports successful-completion p75/p95 only after 20 samples and lists errors,
timeouts, and cancellations separately. Smaller groups say insufficient samples.
Do not present the successful-only percentiles as all-attempt completion time.
Sampling and the per-visit cap limit representation of long browsing sessions.
No current production p75/p95 claim is established by local tests or deployment.

## Rollback

Revert this implementation on main if entry ownership, saved-value preservation,
or authored-copy regressions appear. Production continues to deploy from main.
Telemetry is additive and does not alter or migrate saved records; reverting the
change removes collection without a data rollback. Keep real latency observations
separate from synthetic fixture timings when assessing a rollback.
