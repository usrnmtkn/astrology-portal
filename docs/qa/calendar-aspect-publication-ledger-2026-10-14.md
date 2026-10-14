# Calendar aspect owner publication

The owner reported that Calendar Aspects saved manual passages as drafts but
could not make them live. Production inspection confirmed that saved Jupiter
copy passed deterministic checks and the explicit approval action returned a
completed review, while Studio displayed Inactive and the public content reader
returned no passage.

The `approve-and-schedule` handler marked an aspect LIVE without sending
`x-content-publication-action: publish` to storage. The existing database trigger
requires that signal to create a first publication, replace another published
row, or restore a retired identity. Without it, source status could change while
the publication ledger remained absent or retired.

The October 9 ingress repair (`d4b0f5fe7`, PR 1197) added one action name to
this condition but did not cover aspect approval. This was the same storage
protocol omission in another approval path. The current repair signals every
validated LIVE result after the existing owner and reader gates. Placement
approval still returns REVIEWED/reference and does not publish. Saved-version,
body-hash, writing checks, authorization and reader eligibility remain enforced.

Before reporting a reusable LIVE update as successful, the handler now reads
the publication record and confirms its state, row ID and exact saved timestamp.
Missing or mismatched confirmation returns `PUBLICATION_UNCONFIRMED`; it does
not retry, infer publication from source status, or alter the owner's body.

A second blocker treated saved-aspect editorial warnings as failed readiness.
Short-ending warnings lowered the lint score even when there were no failures;
the editor then requested another check without displaying those warnings.
Explicit saved-aspect rechecks now retain warning findings and counts for owner
review without lowering readiness. The existing review panel displays those
warnings. Generated drafts retain their warning scores, and reader-boundary
failures continue to block publication.

While saving a replacement on the previously approved Jupiter row, production
returned the exact new body as DRAFT but the editor reported a save error because
it expected the old LIVE status. A separate fresh editor confirmed the stored
body and unchanged retrograde field; the write was not repeated. The editor now
submits changed Sky reader fields as DRAFT to match the API's approval reset.
Unchanged Live rows and other content families keep their existing save behavior.

Earlier review fixtures inferred publication records from LIVE source labels;
that could conceal this protocol omission. The shared review fixtures now
require the storage publication signal on LIVE writes. The general CRUD fixture
tracks publication through storage mutations instead of inventing it during
reads. These protocol doubles remain unit fixtures, not database acceptance.

`scripts/test-calendar-aspect-publication-ledger.mts` runs actual create, reopen,
edit, recheck, approval, retirement, live-status, delete and public-reader handlers
against the repository's identity and publication migrations in isolated PGlite.
The browser fixture reuses this SQL store. Neither fabricates publication from
LIVE labels. Acceptance includes exact versions and paragraphs, retrograde
fields, cold/warm reader transport, status parity, stale/unauthorized/duplicate
refusal, signal-loss refusal and explicit missing-ledger recovery.

The original handler failed at missing publication. Deliberately withholding
the storage signal after the repair returns 503 rather than false success;
Studio status and the public reader agree that it is not published. The existing
ingress SQL acceptance test also verifies the shared postcondition for article
approval and explicit season-fallback publication.

The new regression is part of `npm run test:content-studio-api`. No production
copy, writer setting, calculation, database schema or approval requirement is
changed by this code patch. Owner-authorized Studio passage updates are a
separate operation. Exact-head release and deployed reader verification must be
recorded before reporting the workflow fixed in production.
