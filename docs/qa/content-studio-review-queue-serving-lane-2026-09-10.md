# Review queue source review and publication

Initial base: `de8adbba` (PR #729), branch `codex/review-queue-serving-lane`.
Recheck base: `856c5ef2` (current main after PR #731).

The owner's September 10 screenshots show `source/sky-aspect-pair/sun-chiron`
and `source/sky-aspect-pair/moon-chiron` failing publication with HTTP 409,
“Published content must use the serving lane.” PR #729 fixed a separate
revision-completion conflict; it did not fix this path.

`scripts/import-owner-review-library.mjs` imports these keys as reference-lane
`fallback_source` rows. The generic editor offered publication while retaining
the reference lane. Saving also treated their `fallback_hook` block type as
permission to replace their source role with `fallback_hook`. The reader
eligibility boundary excludes source material. Changing only the lane would
not provide a correct reader publication workflow.

The patch:

- preserves reference-source identity and review metadata, repairing the role
  of `source/` keys when saved;
- retains a saved row's event type instead of reconstructing it from block type;
- shows “Reviewed” after confirmed review and keeps queue records attached to
  current saved data instead of stale review-record snapshots;
- explicitly publishes reader-ready rows into the serving lane;
- rejects an unconfirmed status response instead of claiming a successful save;
- explains that source material cannot publish as reader copy, and rejects
  direct source publication at the API boundary even if a request changes its role.

The source passages remain unchanged. During local preparation, no production
database mutation, content approval, commit, or deployment was performed. Publishing these specific
passages verbatim would require a separate reader-routing decision; the owner
was asked whether these are intended as finished reader copy or source notes.

Verification uses an isolated worktree with its own `npm ci` dependencies and
a local knowledge-package build. The API tests exercise the real handler with
mocked storage, including source review, blocked source publication, successful
reader-hook publication and the reader eligibility boundary. Browser tests use
a fresh production build and mocked Admin endpoints; they verify request payloads,
review counts, reopening, visible confirmation, publication retry, mobile and
desktop layouts, and both themes. These are local checks, not production proof.

The initial Admin typecheck/build, bundle budgets, CSS/token audit, CRUD/hydration,
atomic concurrency, special-mutation concurrency, revision completion, and
owner-review queue contract checks pass. The final fresh-build Content Studio
browser run passed all 88 tests. During verification, mobile tests caught that
the existing footer-hint style hid the source-publication explanation; it now
uses the visible shared field-hint style, and all affected cases pass.

## Second verification pass

The owner requested an additional check. A new browser regression reproduced
an unconfirmed publication being accepted when its response contained the wrong
row ID. The generic save boundary now requires the expected ID, status, exact
headline/summary/body, a serving lane for LIVE rows, and no review hold for
LIVE or REVIEWED rows. Package revisions keep their separate proposal rules.

Regressions now reject wrong-row, wrong-lane, held and stale-copy publication
responses. They exercise a failed review, preserve the complete edited passage,
retry successfully, and repair a source role corrupted by the old generic save.
The new queue scenarios explicitly assert the browser JavaScript/console error
collector. One existing reopen fixture was corrected to clear review state on
review, matching the real API handler; it previously simulated an impossible
successful review response.

The expanded full Content Studio browser suite passed all 89 tests. A subsequent
focused pass passed 12 tests covering queue behavior and unconfirmed source saves.
API owner-review, CRUD/hydration, atomic concurrency, special-mutation concurrency,
revision completion, typecheck and CSS/token checks pass. All browser storage
responses remain fixtures; production verification still requires deployment.

The stricter confirmation checks measure 317,027 bytes of aggregate Admin
JavaScript gzip, 27 bytes above the previous limit. The aggregate ceiling is
increased by 100 bytes to 317,100; entry and largest-chunk limits, dependency
boundaries, and reader budgets are unchanged. No new runtime dependency was added.
