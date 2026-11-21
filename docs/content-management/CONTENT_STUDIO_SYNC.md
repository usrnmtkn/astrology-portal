# Content Studio publication synchronization

Content Studio / Supabase owns drafts, complete owner wording, approvals,
publication and retirement. GitHub owns application code and generated published
snapshots. Original imports remain historical/source evidence and are not proof
of the current published wording. Codex must resolve the current Studio revision
before proposing a content change; source roles and exact approval still apply.

## Published snapshot

`apps/web/public/content-studio-last-known-good.json` is a generated recovery
artifact. `scripts/refresh-content-studio-last-known-good.mjs` reads the controlled
public reader endpoint, exports supported durable rows, verifies each selected
publication identity, and preserves retirement records. Drafts, dated editions,
private feedback and authoring history are outside this public export. The private
feedback/source stores need their own protected backup; this file is not one.

The exporter reads the complete publication ledger before and after row export.
A changed ledger, failed page, missing ledger marker or nonadvancing cursor
rejects the candidate without replacing the previous file. Publication revisions
are the synchronization checkpoint, including retirements whose row was deleted.
The existing configured identifier redaction remains mandatory; other reader
wording is preserved. `sourceRevision` is the latest exported row timestamp;
per-key publication records also track retirement-only changes.

The scheduled `--if-changed` path reads only publication metadata when the ledger
matches the committed snapshot. Manual dispatch forces a complete export. A new
publication after an export remains durable in the ledger and is picked up by
the next reconciliation; the exporter does not block or roll back publishing.

## GitHub delivery

The snapshot workflow reconciles every fifteen minutes, subject to GitHub's
scheduling availability. It owns one branch, `automation/content-studio-snapshot`,
and one active PR. A candidate stays frozen while its checks run. Subsequent
publications wait in the existing ledger rather than rewriting an in-flight PR.
The next reconciliation catches them after the candidate merges.

The built-in Actions token needs no additional credential. The publisher
explicitly dispatches `content-studio-api.yml`, `visual-smoke.yml` and
`project-privacy.yml` on the candidate branch, because token-created PR events
do not reliably start those checks without approval. Their completion events
resume the publisher without polling or holding a runner open. The merge requires
all three successful aggregate checks on the current PR head, the expected bot
author and sole generated file, plus all remaining GitHub branch requirements.
It uses normal squash merge with `--match-head-commit`; it never bypasses branch
rules or enables repository auto-merge. Main's required workflows are explicitly
dispatched after a token-authored merge, whose push event would not start them.

A failed or skipped check remains a failure and is not automatically rerun.
Missing workflows are dispatched once per head, and existing runs are retained.
After the frozen head passes, a newer main is merged into the candidate with an
expected-head check. The next reconciliation dispatches checks for that new head;
old passing evidence never authorizes it. Branch-policy failures, update conflicts,
changed PR scope or a storage outage require inspection; no failure makes a newer
Studio draft or an older source eligible.
Only this generated automation branch may be replaced, with an exact remote-head
lease. The publisher never pushes directly to main.

## Verification and recovery

Run `node scripts/test-content-studio-last-known-good.mjs` and
`node scripts/test-content-studio-snapshot-sync.mjs`. The synchronization contract
uses synthetic ledgers and intercepted commands to cover export races,
retirements, missing metadata, duplicate pagination, absent/pending/failed checks,
exact-head merges, PR scope changes and unchanged snapshots. These checks do not
establish hosted permission or production deployment success.

Before release, preserve exact-head API, browser and privacy evidence under the
[affected CI policy](../qa/affected-ci.md). Verify the deployed main revision and
compare the complete selected Chiron reader fields with the exported snapshot;
then verify reader retrieval and offline fallback behavior separately. The first
and final sentences of protected prose must survive rendering. An offline client
can only use its last confirmed snapshot and known retirements until reconnecting.

For a failed delivery, inspect the existing PR and exact-head gates, correct the
specific defect, and dispatch the workflow on main. Do not create another PR or
weaken branch protection. The older run-number snapshot PRs predate this workflow;
review and close them as superseded after the first verified replacement release.
Never run a broad source exporter or package-to-Studio materializer as a repair
for this public snapshot: those tools have a different scope and can write sources.
