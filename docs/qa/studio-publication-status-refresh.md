# Content Studio publication-status refresh

A restored source can publish successfully while the editor still holds its earlier
retirement in the publication cache. The reader-status badge verifies the saved
row separately, so the badge can say Live while the save footer says Retired
everywhere. Reloading the page refreshes the cache but does not repair the missing
same-document refresh.

The editor refreshes the verified ledger when opening a source and after a content
update notice for that source. Notices for unrelated keys do not trigger a ledger
read. The existing after-update helper waits for any older pending read and then
requests fresh state. The editor coalesces queued notices and only the newest
request can clear its pending status. Closing or replacing an editor discards its
pending UI completion.

While verification is pending or unavailable, the footer reports that uncertainty.
Only retirement actions that depend on the ledger are disabled; editing, saving,
and existing recovery controls remain available. Verification has a 20-second UI
deadline. A failed check offers **Refresh publication status**, which starts one
bounded retry. It does not poll, approve writing, or change publication state.
Retirement action labels stay stable while disabled so verification does not
move the adjacent save target.

## Regression checks

Build the isolated checkout's own knowledge package before application tests:

```sh
npm ci
npm run build:knowledge
npm run test:studio-library
npm run typecheck
npm run qa:css-audit
VITE_SUPABASE_URL=https://status-preview.supabase.test VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_visual_fixture npx playwright test -c playwright.config.ts tests/visual/studio-publication-status.spec.ts --workers=1 --retries=0
npm run test:browser-suite-coverage
```

The browser suite uses the actual handlers and publication migrations in a private
PGlite store. It verifies the full rendered Learn and Guide copy in a separate
anonymous reader context, without a user session. Cases cover restored publication
and live saving, an old retired response completing after a publish, verification
failure with manual retry, retirement controls during that failure, and a stable
save target while a held opening ledger finishes. The last case publishes from
the original button position and verifies the complete reader copy. Required
writes and hydration responses must complete; unexpected HTTP errors, page errors,
failed requests and external destinations fail the test. The intentionally injected
503 responses are identified by their exact fixture requests.

The browser check uses a valid anonymous fixture key and a distinct synthetic
hostname. Admitted public-ledger and empty-session reads are fulfilled by method
and path, so the same isolated store also handles deployed frontend configuration.
Every other external request remains a failure. This does not test production
storage writes or prove the deployed database configuration.

The controller tests also cover coalescing, unrelated notices, disposal, a failed
read, and a late response after the verification deadline. These tests do not
replace the required full Content Studio API gate, final-base browser checks, or
verification on the merged production deployment. Keep protected references and
live operational evidence outside Git and public test attachments.

## Final-base verification and bundle cost

On main `ffa981518`, the expanded 40-case Calendar, Articles/Guides and
publication-status matrix passes with zero retries, skips or flakes. It includes
five publication-status cases. The initial four also passed with a distinct
synthetic REST hostname. Earlier runs preserve the hardcoded-host failure, the
missing Calendar fixture ledger, a delayed-publication acknowledgment race and
the 66-pixel save-target movement before its label fix.

Calendar fixtures now expose the publication ledger from their isolated store.
Article tests delay a publication response after storage commits and require its
HTTP 200/409, completed transfer and cleared pending state before navigation.
Storage state alone previously allowed navigation to abort that acknowledgment,
correctly leaving Studio's pending-publication recovery active. Conflict alerts,
saved revisions and complete reader-copy assertions remain enforced. The layout
regression uses the actual publication SQL functions for the ensuing write.

Fresh baseline and candidate builds use independent `npm ci` dependencies,
ARM Node 22.20.0, zlib 1.3.1-470d3a2 and identical synthetic Supabase settings.
Web builds also enable natal aspect patterns. Aggregate web JavaScript grows
from 3,687,075 to 3,687,490 gzip bytes (+415), including 414 bytes in the deferred
Studio dashboard. A 500-byte aggregate allocation leaves 160 bytes. App/reader
boot measures 396,374/454,726 bytes, one byte above baseline; initial and total
CSS stay at 58,352/143,985 bytes. Their limits remain unchanged.

Standalone Studio startup grows from 816,995/237,057 raw/gzip bytes to
818,230/237,563 (+1,235/+506). Allocations of 1,300 raw and 550 gzip bytes leave
170/237 bytes. Aggregate Studio JavaScript grows by 447 bytes to 863,880 and
passes the unchanged 864,100-byte limit. These are measured reliability costs;
they do not establish a loading-speed improvement. Other limits, dependencies
and owner writing remain unchanged. Full API/content checks, exact-head hosted
checks and production acceptance are separate release gates.
