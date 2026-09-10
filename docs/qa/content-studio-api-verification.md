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
- Bulk updates compare the stored version and exclude LIVE rows at write time.
  New inserts ignore conflicts instead of merging over competing inserts.
- Calendar partial proposals, all 24 materialized shapes, exact saved copy,
  separate revisions and actual reader hydration/selection.
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
  proof of stale-editor protection. Bulk writes always compare the server-read
  version, and also reject a supplied stale client version.

## Changes to editor or publication behavior

Add a failing actual-handler regression first, using the real materializer or
the relevant saved-document shape. Cover both success and refusal behavior.
Verify complete owner text through the actual reader loader where publication
or reader selection changes. Keep editorial decisions separate from deployment.

Run the relevant fresh-build browser suite, for example:

```sh
npx playwright test tests/visual/calendar-review-queue-api.spec.ts --project=chromium-desktop
npx playwright test tests/visual/content-dashboard-admin-user-flows.spec.ts --project=chromium-desktop
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

Local repair evidence: all eight new contract groups pass. Running the same
regression against the unchanged handler from main `d45a0275` fails six groups;
the ordinary lifecycle and authorization groups still pass. The complete
`test:content-studio-api` suite and admin/web typechecks pass on the repair.
CI and deployment results belong to the release PR and its exact commit.
