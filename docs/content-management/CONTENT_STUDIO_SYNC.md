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
and one active PR. A candidate stays frozen while queued or under validation. Subsequent
publications wait in the existing ledger rather than rewriting an in-flight PR.
The next reconciliation catches them after the candidate merges.

The built-in Actions token prepares the export and opens the PR; it does not
own release admission. Each later reconciliation only verifies the existing
PR's bot author, main target, generated branch, exact head and sole generated
file, then reports `queued`. It never refreshes that candidate, changes the
active slot, approves runs, starts or retries checks, updates its base or merges,
even when checks appear successful. No Actions, checks or statuses write
permission is requested by this preparation workflow.

The existing coordinator delivers the PR under the
[release queue](../qa/release-queue.md), using its existing authorized maintainer
session. The coordinator assigns admission, completes the scoped preflight on
the final candidate, and starts or resumes the genuine pull-request workflows.
GitHub documents that [PR events created by `GITHUB_TOKEN` require workflow-run
approval](https://docs.github.com/en/actions/concepts/security/github_token).
The scheduled bot cannot assume that approval has happened. Manual dispatch
on the candidate branch is not a substitute for pull-request checks. This
change introduces no additional token, app, permission request or self-approval.

Delivery requires all three required checks on the final head, normal protected
merge, the main Git integration deployment and automatic affected production
acceptance. The coordinator preserves failures and completed evidence and updates
the candidate once onto accepted main before freezing and validating it. The
scheduled publisher does not infer admission or release success from old passes.
Unattended bot-only validation and merge are not implemented with the current
token and admission boundary; reconciliation prepares a queued PR rather than
claiming the deployed snapshot is already synchronized.

Branch-policy failures, update conflicts, changed PR scope or a storage outage
require inspection; no failure makes a newer Studio draft or an older source eligible.
Only this generated automation branch may be replaced, with an exact remote-head
lease. The publisher never pushes directly to main.

## Verification and recovery

Run `node scripts/test-content-studio-last-known-good.mjs` and
`node scripts/test-content-studio-snapshot-sync.mjs`. The synchronization contract
uses synthetic ledgers and intercepted commands to cover export races,
retirements, missing metadata, duplicate pagination, frozen PRs with any gate
state, forbidden release operations, PR scope changes and unchanged snapshots. These checks do not
establish hosted permission or production deployment success.

Before release, preserve exact-head API, browser and privacy evidence under the
[affected CI policy](../qa/affected-ci.md). Verify the deployed main revision and
compare the complete selected Chiron reader fields with the exported snapshot;
then verify reader retrieval and offline fallback behavior separately. The first
and final sentences of protected prose must survive rendering. An offline client
can only use its last confirmed snapshot and known retirements until reconnecting.

For a failed delivery, inspect the existing PR and exact-head gates, correct the
specific defect, and follow the coordinator's existing release process. A manual
refresh runs only on main after the pending PR has been delivered or explicitly
resolved; it never replaces an in-flight head. Do not create another PR or weaken
branch protection. The older run-number snapshot PRs predate this workflow;
review and close them as superseded after the first verified replacement release.
Never run a broad source exporter or package-to-Studio materializer as a repair
for this public snapshot: those tools have a different scope and can write sources.
