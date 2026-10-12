# Content Studio API verification

This is the ongoing verification contract, not a one-time assertion that the
entire API is free of defects. It applies to every repository update, including
reader, content package and dependency changes.

## Every update

1. Follow repository provenance instructions: fetch origin, inspect the remote,
   branch, clean/dirty status and divergence from main. Preserve owner work.
2. In the isolated checkout, install its own dependencies with `npm ci`.
3. Run `npm run test:content-studio-api`. Its lifecycle builds the local knowledge
   package before tests. Do not run another knowledge rebuild concurrently.
4. Require the `content-studio-api` check from the `Content Studio API contract`
   workflow on the exact PR head. It intentionally runs without path filters on
   all PRs and every branch push, including branches without a PR. Runs are
   independent: a later push does not cancel an earlier revision's API QA.
   It does not require production credentials.
5. Include the tested SHA, command, outcome, and material limitations in the PR.
   Do not remove a failed assertion or widen an approval rule to make CI pass.

GitHub's active `Content Studio API QA` ruleset requires `content-studio-api`
from the GitHub Actions app before main can be updated, with the branch current
against main and no bypass actors. Verify the live ruleset when changing release
configuration; workflow YAML alone does not enforce a merge gate.

Here, a check-in means a push to GitHub. The workflow tests the pushed revision
and the PR integration revision; it does not run for each unpushed local commit
or each intermediate commit in a multi-commit push. Local commits retain the
privacy hook, and the full API command above remains required before merging.

## What the gate verifies

- Actual authenticated handler: create, read/reopen, repeated edits, review,
  publish, archive, restore and protected/version-checked delete.
- Invalid JSON, non-object bodies, wrong field types, unknown actions, empty
  updates and duplicate batch identities fail before writes.
- Body parsing exercises Vercel's throwing lazy `req.body` getter as well as
  raw streams. Malformed JSON remains 400, size rejection remains 413, and
  unexpected runtime failures remain server errors across actual reader,
  generated-content, personalized-content and publication handlers.
- Profile normalization runs under the authenticated database role, not only
  the migration owner. Real SQL verifies insert/update/read-after-save,
  invalid-time rollback, anonymous and cross-owner denial, and unchanged RLS.
- Publication cannot retain a reference lane or review hold.
- Package publication uses the reader's key admission rules. A new unsupported
  key returns 409 before create, batch publication, or revision sign-off writes;
  its draft remains editable. Registered sources and the separate Calendar and
  compatibility reader paths retain their existing publication rules.
- New canonical House Transit intros/sign passages and exact synastry pairs
  reach the actual dashboard loader and shipped resolver without requiring a
  bundled catalog entry. Synastry publication requires both chart directions.
  The roundtrip test checks the complete source bytes, rendered wording, and
  the owner-action receipt; synthetic fixtures never change production copy.
- Compatibility's [missing-aspect creator](compatibility-aspect-creation.md)
  covers search discovery, chart-order lookup, partial drafts, holder variables,
  reload, publication, and both reader directions against the actual handler.
- Staged New Moon / Full Moon sign macros (including Aquarius New Moon, absent
  from the approved bundle) must save, reopen and publish through the actual
  handler, then hydrate the shipped resolver and Calendar Day reading without
  losing paragraphs. Unsupported identities, unapproved drafts, stale versions
  and denied publication identities remain blocked. The Calendar Review Queue
  browser suite covers this editor-to-reader flow in both themes and widths.
- Browser upgrade fixtures seed an old overlay cache at the same database
  revision. The new cache schema must refetch sources the previous admission
  rules omitted, without requiring the owner to edit or publish them again.
- New summary sources must be tested through POST, not only by PATCHing an
  existing fixture. Studio's legacy `card` mode is normalized to database mode
  `feed` before any create, bulk create, or update. The roundtrip storage double
  rejects `card`, matching the production constraint that exposed this bug on
  2026-09-10 during the approved Sky summary import.
- Bulk updates compare the stored version and exclude LIVE rows at write time.
  New inserts ignore conflicts instead of merging over competing inserts.
- Legacy update/delete requests without a client timestamp still compare the
  API-read version, protecting changes made during the request.
- Calendar partial proposals, all 24 materialized shapes, exact saved copy,
  separate revisions and actual reader hydration/selection.
- Personal Transit source routing across every selectable transiting body, natal
  point, aspect and both audiences at a representative sign. Each successful
  preview must link to an existing source; missing approved content must report
  a source gap. The actual-handler check separately verifies publication edits,
  retirement and request-scoped reader state.
- Existing Sky placement publication, copy recovery, reader revalidation,
  storage protocol/timeouts, composition sources, live status, editor state
  and protected Uranus copy parity.

`scripts/test-content-studio-crud-contract.mjs` is the focused contract test:

```sh
node --import tsx scripts/test-content-studio-crud-contract.mjs
```

Its storage double implements conditional PostgREST writes and injects races
between lookup and write. The real API handler handles requests. Fixtures use
reserved `.invalid` origins, reassert test credentials after local-env loading,
and reject unexpected storage origins. Do not point these fixtures at production.

## CSV editing verification

`npm run test:studio-csv` runs parser and actual-handler regressions, and is part
of the full API gate. It covers complete Unicode/multiline text, formula-safe
round trips, immutable identities, duplicate rows/columns, structured article
fields, package proposals, clearing optional text, default draft saves, original
text and hash receipts, reader-history privacy, authorization and storage races.
It also covers yes/no/blank and legacy publication intent, separate versioned
publication, exact reader retrieval, package receipts, and refusal to publish a
template while retaining the saved draft.

`tests/visual/studio-csv.spec.ts` exercises export across all pages, selected-row
export, unchanged import, mixed draft/publication preview, clear-field preview,
save/publish/reload and stale-file rejection at desktop/mobile widths in both
themes. Its batch-conflict
case checks the live-content notice, confirmed partial saves and refusal to retry
uncertain writes. Its empty/error case checks disabled empty export, no partial
download after a failed document read, invalid-file rejection, and recovery. All
browser writes use the real handlers against an isolated fixture store.
Additional browser cases cover a separate package revision, a publication gate
refusal, a newer edit between save and publication, and a lost response after a
confirmed storage commit. Counts include only confirmed publications and the
batch stops without replaying writes or touching later rows.

CSV actions use `PATCH /api/admin/generated-content` with the exported identity,
version and text cells. The handler re-derives the editable fields from storage,
retains import receipts under `source_snapshot.editorialImport.csvHistory`, and
then applies the normal draft save path. The CSV's `publish` cell is retained as
intent only; it cannot change that API action into publication. After the owner
chooses **Save & publish**, the browser submits the saved row's exact ID/version
to the existing package approval action or ordinary publication update. It
accepts no calculated metadata. Generic editor/publication contracts continue
to apply, including pending package-publication receipt recovery.

Local acceptance on October 12, 2026 uses the
`feat/content-studio-csv` implementation based on
`3c9a441f8ea9fd3904a419bf6e337898ac688b3b`, matching refreshed `origin/main`.
The CSV source fingerprint is
`47df2428edbf1a136c5ad548c20c104398cd923830af9cacc65ed0c60736492c`:
SHA-256 of sorted modified/new code and test paths, each followed by a NUL,
its complete bytes and another NUL; documentation is excluded.

| Acceptance criterion | Local result and evidence |
| --- | --- |
| Discover CSV actions; export selected/all filtered pages | Passed: ten Chromium scenarios, including 31 rows across pages and single-row selection. |
| Preview before writing; preserve full text and explicit clearing | Passed: eleven parser/actual-handler tests and browser save/reload checks. |
| Explicit publication intent and reader delivery | Passed: defaults and legacy files stay drafts; mixed yes/no batches, unchanged draft publication, versioned package proposals and exact public reader responses. |
| Reject stale writes and stop partial batches | Passed: API storage races, browser save conflict, publication refusal, save-to-publish race and lost response after commit; confirmed saves/publications remain distinguishable and later rows untouched. |
| Empty, failed-read and invalid-file recovery | Passed: browser error scenario; no partial download or content writes. |
| Desktop/mobile and light/dark layouts | Passed: four rendered variants, correct comparison columns, body typography, preserved line breaks and no horizontal overflow. |
| Local build and design constraints | Passed: admin/web builds, admin typecheck, CSS/token audits and admin bundle budget. |
| Reader-copy and privacy boundaries | Passed: canonical and isolated saved-row audits, reader-copy regression and protected-policy scans. |
| Required complete API gate | Passed: `npm run test:content-studio-api`, using native ARM Node and the existing protected local report evidence; no assertions waived. |

These checks use isolated synthetic storage, not owner-content mutations.
Native Excel/Numbers editing remains unverified. Exact commit, CI, preview and
production verification results belong to the release PR.

### CSV release bundle measurement

Independent `npm ci` builds of main `e4911325f` and CSV head `51d76b477`
with the same visual-smoke Supabase placeholders measure aggregate JavaScript
at 3,564,721 and 3,571,236 gzip bytes (+6,515). The separate CSV chunk is 5,682
bytes. Aggregate CSS grows from 117,833 to 117,922 (+89), and the shared deferred
Studio/Memory stylesheet grows from 29,572 to 29,661 (+89). App boot measures
466,384 versus 466,378 and reader boot 520,724 versus 520,718 bytes.

The release allocates 5,250 bytes above the prior aggregate JavaScript ceiling
(using existing headroom), plus 100 bytes to each affected CSS ceiling. Hosted
CI's 3,571,283 JavaScript measurement leaves 467 bytes below the new limit.
The CSV chunk has its own 6,000-byte limit and must remain a dynamic entry
outside reader startup. Existing startup, individual chunk, source payload and
runtime-performance limits remain enforced. No dependency or reader prose was
added; these measurements account for the requested feature's implementation.

## API response contracts

- Malformed/unsupported input: 400, no saved edit.
- Unauthorized: 401, no storage mutation.
- Missing row: 404.
- Stale version, concurrent insert, protected deletion or contradictory
  publication state: 409; newer content remains intact.
- Storage protocol failure: 502; storage timeout: 504. Actual unexpected
  server/storage failures remain server errors, not validation successes.
- A POST batch is **not atomic**. If a later row fails after earlier rows saved,
  the error response includes `savedRows`. Reconcile those rows and reload the
  conflicting source before retrying. Do not present the whole batch as saved.
- Existing LIVE rows are skipped and returned in `skippedLiveRows`. They are
  never demoted by a compile/import operation.
- Editor callers must send `expectedUpdatedAt` from the opened or last-saved
  row. Legacy generic callers may omit it; that compatibility is not
  proof of stale-editor protection. Update/delete and bulk writes compare the
  server-read version when present, and reject a supplied stale client version.

## Changes to editor or publication behavior

Add a failing actual-handler regression first, using the real materializer or
the relevant saved-document shape. Cover both success and refusal behavior.
Verify complete owner text through the actual reader loader where publication
or reader selection changes. Keep editorial decisions separate from deployment.

Run the relevant fresh-build browser suite, for example:

```sh
npx playwright test tests/visual/calendar-review-queue-api.spec.ts --project=chromium-desktop
npx playwright test tests/visual/content-dashboard-admin-user-flows.spec.ts --project=chromium-desktop
npx playwright test tests/visual/client-facing-user-flows.spec.ts --grep 'new Studio .* publication' --workers=1
```

Use a fresh preview from this checkout; do not reuse another task's server.
Browser tests with isolated storage verify frontend/API integration, not actual
production database mutations. Run the applicable typechecks and bundle gates;
run `npm run qa:css-audit` when component or CSS surfaces change.

## Production verification

Merge to main through the reviewed PR and let Vercel's Git integration deploy.
Confirm the READY production deployment names the merge SHA and main ref.
Check `/api/health`, then rerun the applicable frontend regression against:

```sh
PLAYWRIGHT_BASE_URL=https://tldrastro.vercel.app npx playwright test tests/visual/calendar-review-queue-api.spec.ts --project=chromium-desktop
```

This uses deployed frontend assets and isolated test storage. Inspect the live
owner editor read-only to verify real saved-row hydration. Do not approve,
publish, rewrite or delete owner drafts merely to obtain test evidence.
State these verification limits explicitly; a healthy API does not establish
that every CRUD path or production database transition was exercised.

## September 10, 2026 repair

On main `d45a0275`, isolated actual-handler probes reproduced malformed JSON
returning 500, empty PATCH changing the version, unsupported owner actions
falling through to writes, LIVE updates retaining review holds, and bulk
lookup/write races overwriting newer publications. The dedicated CRUD contract
regression covers each failure and the ordinary lifecycle. No authored copy or
production database content is part of these code changes.

Local repair evidence: all nine new contract groups pass. Running the same
regression against the unchanged handler from main `d45a0275` fails seven groups;
the ordinary lifecycle and authorization groups still pass. The complete
`test:content-studio-api` suite and admin/web typechecks pass on the repair.
CI and deployment results belong to the release PR and its exact commit.

## Review Queue owner workflow

See [the full workflow contract](review-queue-workflow.md). The required API gate
also covers writing actions, source revisions, version history, owner-final
checks and actual reader selection. Visual smoke includes the corresponding
desktop/mobile and light/dark browser matrix.

## Secondary CRUD audit (September 10, 2026)

The separate publication and personalized-content endpoints now reject invalid
request shapes/types before storage. Personalized reads and writes require
confirmed row arrays and matching mutation identities; malformed upstream data
returns 502 instead of successful empty data or a misleading 404. Publication
retains 400/413/504 errors and verifies the exact live restoration receipt,
including microsecond timestamps. Retirement intentionally permits the ledger's
previous row identity, matching its existing database function.

Both endpoints consume storage JSON within the request deadline, including a
stalled body after headers. Transport/protocol failures request a reload before
retry because a write may already have committed. No automatic write retry is
introduced. The isolated actual-handler secondary CRUD regression and the
existing publication/preview lifecycle regression run in the mandatory API gate.
These checks do not approve prose or exercise mutations in production storage.

The same audit found the personalized list filter still omitted `friends` and
`year_ahead`, although both are supported by the September 6 database constraint
and the current generation client. Both filters now reach storage; unsupported
surface names still return 400 before lookup. This is an API filter correction,
not a new content surface or a database migration.

### Reader-copy import boundary

The API gate also runs `test:reader-copy-boundary` and the actual handler tests in
`test-editorial-copy-api.mts`. Imports must keep workflow labels, drafting
instructions and source notes outside reader fields, including nested package
revisions. See [the saved-row audit](content-studio-editorial-copy-audit-2026-09-11.md)
for the repair journal, full-inventory checks and agent requirements.

### Secondary editors and shared transport

The [2026-09-10 route audit](content-studio-api-audit-2026-09-10.md) records scope, defects, and the distinction between source review and actual-handler verification. The required API gate now also covers Aspect Patterns, issue resolutions/source decisions, queue prepopulation, and report correction/feedback handlers. Test stores use `.invalid` hosts; never run these write scenarios against production.

Existing Aspect Pattern and report-unit edits must submit `expectedUpdatedAt` from the opened record. Issue resolutions submit their opened version or null for first creation. Conflicts require reload; clients must preserve unsaved input. Prepopulation reports `skippedExistingRows`; on a failed batch, `savedRows` contains confirmed writes and `failedContentKey` identifies the uncertain/failed operation. Reload before retrying an uncertain write.

## Lunar ingress editing

Calendar Write-ups > Lunar ingresses lists the twelve existing Moon sign-change
passages, sorted by the sign entered. The authenticated inventory supplies complete
original sources when no saved row exists; browsing does not insert a draft. Saved
rows take precedence. Edit opens the same source used by Calendar ingress events
and Day/Week sign changes, with Save draft and Save & publish kept separate.

`test-calendar-lunar-ingress-editor.mts` exercises the actual inventory and mutation
handlers for all twelve keys, original hashes, publication admission, the actual
reader loader and Calendar event adapter, stale writes and unauthorized reads.
`calendar-lunar-ingresses.spec.ts` covers navigation, full-copy save/reopen/publish,
reader display, computed table typography, empty search results and light/dark
mobile/desktop layouts. Browser write tests use isolated storage, including when
testing deployed assets. Existing reader prose and computed ingress timing are
unchanged.

## October 5 route and source-integrity audit

The required API command now includes the complete protected-route access matrix,
paginated virtual-source integrity, and a bounded 16,000-row inventory benchmark.
New admin handlers must be classified in `config/content-studio-api-routes.json`.
The matrix executes declared methods with anonymous, ordinary and expired sessions;
it does not replace each route's positive CRUD/publication regression.

Virtual inventory sources must respect state filters and must never replace a saved
source that appeared on an earlier page or was filtered out. A failed or truncated
saved-key lookup must remain an error. The audit and verification limits are recorded
in [the October 5 report](content-studio-api-audit-2026-10-05.md).
