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
   all PRs and main pushes; it does not require production credentials.
5. Include the tested SHA, command, outcome, and material limitations in the PR.
   Do not remove a failed assertion or widen an approval rule to make CI pass.

## What the gate verifies

- Actual authenticated handler: create, read/reopen, repeated edits, review,
  publish, archive, restore and protected/version-checked delete.
- Invalid JSON, non-object bodies, wrong field types, unknown actions, empty
  updates and duplicate batch identities fail before writes.
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
