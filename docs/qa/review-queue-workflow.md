# Review Queue workflow and release verification

The queue is an editorial workspace. Saving, checking writing, owner review,
and reader publication are separate states. A model's prose verdict does not
replace the owner decision (see `docs/writing/WRITING_PIPELINE_V3.md`).

## Editor flow

- **Ready for review**: saved writing with no outstanding writing checks.
- **Needs changes**: missing body or failed/outdated checks. Open the row, save
  edits, then **Run writing checks**. This action is deterministic, preserves
  the body exactly, makes no model call, and cannot approve or publish it.
- **Missing writing / upcoming**: calculated configurations. A missing generated
  variant is not proof of a reader coverage gap. **Generate draft** runs the
  configured source-backed writer for one empty identity; **Write manually**
  opens an empty editor. Neither action publishes writing. Missing approved
  generation sources are reported; the manual path remains available.
- **Source library**: background material, never exact reader copy. Saving a
  pair-source edit makes it pending again. Mark reviewed activates the exact
  saved revision for future Sky aspect generation. Existing cards are not rewritten.
- **Publish / Approve & schedule**: an explicit owner action, after saved-text
  checks. Placement approval remains **Approve for package**, because governed
  package distribution is a separate operation. It is never labeled Live by
  this action. Use its existing serving-article editor for active reader copy.
- **Verify publication status / Open reader view**: verify eligibility and the
  matching reader context. Higher-priority approved writing can win selection;
  a status badge alone never proves which passage was rendered.

## Draft generation authorization

The owner explicitly authorized draft-only use of the existing source-backed Sky
card generator in the Review Queue task on 2026-09-10, after being told that the
canonical v3 card/aspect structures are still missing. Evidence: Codex task
`01a08b82-0b3a-77d2-90fd-cfc0a527231a`, owner reply “i authorize. I wrote those new transit to natal chart aspects in the You Transits”. The preceding question explicitly separated draft-only Sky generation from publication. This bounded exception
does not approve generated wording, change the article pipeline, or authorize
rewriting owner-authored You Transits. The Studio writer uses no model prose judge.

The imported `ms/composite/*`, `cc/fallback*`, and `fallback-source/*` families
are source material even when older rows lack role metadata. They remain
reviewable in Source library and cannot be directly published as finished copy.

## API and source contracts

`POST /api/admin/sky-draft-writing` accepts only one `contentKey`, an `action`
(`generate` or `recheck`), and `expectedUpdatedAt` for an existing row.
Authorization is identical to the other Content Studio APIs. The route
reserves the identity/version before work and conditionally saves its results.
A duplicate request, stale version, or competing edit cannot overwrite text.
An abandoned operation can be retried after its bounded five-minute lifetime.
Generation cannot replace a nonempty body. Errors release the reservation when
possible and keep the saved body. The editor reloads the saved version for retry.

Checks store the content key and SHA-256 of the exact body, deterministic
findings, and `reviewPolicy: owner-final-v1`. Publication verifies the body hash;
edits invalidate prior check eligibility. No synthetic judge score is created.
The reader validates exact pair/sign identity, check provenance, publication
state and its ordinary safety boundary. Legacy publication records retain their
existing checks; opening and rechecking a draft moves it into this owner workflow.

Pair source revisions are read from `generated_interpretations` only when
REVIEWED, reference-lane and free of review holds. Both explicit Studio generation
and the existing scheduled aspect generator consume that saved text. Used source
revisions carry the row ID, timestamp and exact-text hash. Source and Sky copy
edits retain prior writing in `source_snapshot.studioRevisionHistory`.

## Required checks on every update

Run `npm run test:content-studio-api`; it includes the actual-handler workflow
suite `scripts/test-review-queue-workflow.mjs`. The suite isolates storage and
writer responses, then separately exercises the real deterministic checker.
It verifies generation, manual editing, recheck without rewriting, approval,
actual reader hydration and selection, source activation, history, invalid
requests, stale/concurrent edits and retry after writer failure.

Run the browser release path from a fresh current build:

```sh
npx playwright test tests/visual/review-queue-workflow.spec.ts tests/visual/calendar-review-queue-api.spec.ts --workers=1
npm run qa:css-audit
npm run typecheck -w @tldr/admin
```

The browser matrix covers desktop/mobile and light/dark. All API writes go to
an isolated actual-handler process; writer replies are fixtures. These tests
never authorize or publish real owner content. The unfiltered CI API contract
and Visual smoke workflows must pass on the exact PR head. Record the tested
SHA, results, production deployment SHA, and remaining limitations in the PR.

## Production verification

Confirm the main merge commit has a READY deployment. Re-run the browser matrix
against its production assets with the same isolated API fixture routes, then
inspect the signed-in production queue read-only. Confirm source separation,
writing checks and blocked publication states on real records. Do not publish
owner writing merely to test the feature. Live provider calls and real content
publication require the user's authorization for that content/action.

A successful fixture model response does not verify provider availability or
writing quality. Record those limitations explicitly. Do not claim an entire
content family is covered because one sample or one database write passed.
