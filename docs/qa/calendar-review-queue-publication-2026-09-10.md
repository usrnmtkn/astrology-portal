# Calendar Review Queue publication repair

The production Venus–Mars error was reproduced against main `207d4872` through
`api/admin/generated-content.ts`: HTTP 500, `Package proposals cannot change contentKey.`
Read-only production inspection found 24 Calendar proposals with `packageDraft: { Body }`;
none included `contentKey`, and none had competing rows in another mode. These patches
are the intentional output of `stage-calendar-aspect-content-studio-drafts.mjs`.

The API incorrectly required a complete record. It now inherits omitted identity fields
and rejects actual structural changes with HTTP 400. Publication also checks the saved
revision and target have the same key.

A second failure was behind the first: the editor offered Save & publish for these
Calendar rows without a connected owner-publication or reader-override path. The explicit,
authenticated, version-checked action now publishes the exact saved Body for a registered
composed Calendar card. It records the key, action, timestamp, baseline hash and copy hash.
Ordinary saves cannot approve the staged copy. The original package record remains in
version history. Later edits fork a held revision and leave the last publication intact.

Calendar requests both planet orders of the exact sign-specific key and renders the
published passage verbatim. The existing Details passage remains from the composed card.
Wrong signs and retired keys cannot select the publication. Studio live status uses the
same reader selection. Other staged Calendar families retain their separate release gate.

## Evidence

- `scripts/test-calendar-review-queue-api.mjs`: all 24 materialized proposal shapes save,
  reopen, publish, load through the actual reader service, render in both planet orders,
  preserve the previous publication while editing, and republish. Negative cases cover
  wrong signs, structural mutation, crossed target identity, stale versions, empty copy,
  ordinary status promotion and unauthorized publication.
- The same test passes using a read-only copy of the actual production Venus–Mars row.
  That fixture is stored locally outside Git; the production row was not modified.
- `tests/visual/calendar-review-queue-api.spec.ts`: mobile/desktop and light/dark editor
  flows send mutations and full-document reads through the real API handler. Only the
  storage service and unrelated inventories are fixtures. All four flows passed.
- The combined Content Studio browser run passed 93 tests.
- The existing Calendar exact-copy parity regression passed all 758 directions.
- Web/admin typechecks, CSS audits, production-style status-module startup, focused
  owner-action tests and bundle budgets passed.

No authored source rows, approval ledgers, calculation facts, generated content package
or production database records were changed by this repair. Deployment enables the
owner's future explicit publication actions; it does not approve the 24 drafts.
