# Calendar lunation writer verification

Implementation on `fix/lunation-writer`, based on
`8f9fdfc17a02422af73afcdd9dfd5525f43d9531`. No reader copy, publication records,
or protected owner passages were changed.

Verified on 2026-09-27:

- `node tests/astro-writing/lunation-writing.test.mjs`: passed for both phases,
  governed meaning/register separation, complete owner passage hashes, private
  correction selection, no call before argument approval, missing evidence,
  changed calculations, unsupported targets, and unapproved candidate state.
- `npm run test:content-studio-api`: passed in this checkout with its own
  `npm ci` dependencies, including the knowledge build and API typecheck.
- `npx tsx scripts/test-lunation-studio.mts`: passed against the actual handler
  and isolated storage. Covers private saves, stale and concurrent edits,
  calculated New/Full Moon events, malformed dates, prior approval recovery,
  saved guidance reaching the canonical writer, changed evidence, request
  reservation, response retrieval, reload recovery, and publication denial.
- Fresh-build Playwright matrix: passed at 390 and 1440 pixels in light and
  dark themes. Covers Calendar navigation, shared heading typography, draft
  state, guidance save/reload, exact-key selection, plan preparation, candidate
  save/reload, and conflict preservation. The API handler uses synthetic storage;
  no paid provider or production write is part of this browser regression.
- Admin and lunar API typechecks and CSS/token/design-system audits: passed.
- The deferred workspace adds 4.1 kB gzip. Aggregate admin JavaScript measures
  747.9 kB; its budget increases by 5,000 bytes to 749,750 for this feature.
  Entry, largest-chunk, graph and forbidden initial-payload budgets are unchanged.
- Effective-writing-rules foundation, runtime integration, and writing-kernel
  runtime-asset checks: passed.
- The new workflow document is covered by the memory source index. Complete
  source and section hashes and full-detail retrieval were verified. This
  architecture note is not positive writing evidence or prose approval.
- The calculated Libra New Moon facts match the previously approved packet
  exactly. Private review artifacts remain outside the repository.
- `git diff --check`: passed.

Studio database verification confirmed private DRAFT/reference guidance and
workspace rows, the exact saved argument/call approval hashes, and empty reader
fields. The exact rejection and owner reason are in the restricted existing
feedback store. They are not in Git, reader fields, or browser bundles. Client
roles cannot select that feedback table. The database seed is distinct from
shipping the new editor code.

The broader `tests/astro-writing/harness.test.mjs` stops at its pre-existing
protected voice-document hash assertion on line 159. The identical failure was
reproduced in an unchanged checkout of the same main revision: expected
`8ac0a55bfe7b542204d08595ef13cf2ca49bc92c1f8734a230b5d2249c04afbe`, actual
`0346f9c9d43aa8f6df1db6baee91dddca7f52822f3d2792b6a4d3a8b1d3f7de6`.
Neither the protected document nor its integrity assertion was altered.

No paid model generation or reader publication is claimed by these tests.
Deployment and live saved-row hydration must be verified on the released main
revision. A resulting body and journal question still require exact wording
review before the existing publication and reader verification workflow.
