# Horoscope edition deletion

Unpublished editions have a Delete action in the saved-editions table and a
Delete edition action beside Archive or Restore in the opened edition. The
confirmation identifies period, dates, time zone and the saved readings being
removed. Cancelling sends no request. Dirty, active and running editor states
cannot delete the current edition. Published editions must first be archived.
Approved writing examples and profiles are separate records and are unchanged.
Private revisions are labeled Delete draft revision; deleting one keeps its
published source edition intact.

Deletion uses the existing authenticated generated-content DELETE endpoint with
the exact selected ID and opened version. The handler rejects published rows,
stale versions, active sign requests, running batches and pending shared Weekly
or Daily reviews. A successful response must identify the exact removed row and
version. An unreadable or uncertain reply permits a readback to establish that
the row is absent; it never dispatches a second DELETE automatically. A conflict
preserves newer content for refresh and review. A completed response after an
editor/credential change cannot clear another open edition.

Seasonal private run journals previously prevented parent deletion through a
required foreign key. The accompanying migration makes only that link nullable
with `ON DELETE SET NULL`. Deleting an edition retains every complete journal
state, source, candidate, hash, revision and timestamp. Existing RLS and grants
remain unchanged. Detached journals cannot be retrieved or advanced using the
deleted edition's identity. This is edition deletion, not an erasure claim for
private audit history.

The saved table keeps its existing labels, sort/filter behavior and shared
styles in a deferred component. No heading, CSS token, writer instruction,
calculation, publication approval or model request is changed.

## Required verification

Run from an isolated checkout with its own dependencies and built knowledge
package. Separate handler and database regressions include real isolated PostgreSQL checks:

```sh
npm ci
npm run build:knowledge
node --import tsx scripts/test-horoscope-deletion.mts
node --import tsx scripts/test-horoscope-deletion-sql.mts
npm run test:content-studio-api
npm run typecheck
npm run typecheck:server
npm run qa:css-audit
npx playwright test -c playwright.horoscope-reader.config.ts horoscope-deletion.spec.ts horoscope-edition-table.spec.ts
```

The synthetic cases cover cancellation, all four periods, list/detail controls,
exact versions, published and in-flight protection, stale conflicts, unavailable
storage, lost acknowledgements, reload persistence and unrelated source/reader
preservation. PostgreSQL reproduces the original foreign-key failure and checks
exact retained audit bytes, unchanged security and unrelated journals after the
migration. Browser checks cover desktop/mobile in light/dark themes. No owner
edition is deleted to obtain acceptance evidence. Record actual results and the
tested revision in release evidence; source preparation alone is not a pass.
