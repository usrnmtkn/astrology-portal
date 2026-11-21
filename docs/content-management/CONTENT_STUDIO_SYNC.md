# Content Studio and GitHub synchronization

Content Studio is the editorial source of truth. Saving a draft never changes the
published version. Normal version-checked owner publication updates the reader
and its publication ledger; this workflow neither approves nor writes Studio rows.
Original imports in the application repository remain historical source evidence.
Resolve the current Studio publication or its generated recovery copy before
proposing a content change; never restore old wording over newer approved writing.

## Automatic GitHub recovery

The trusted-main workflow reconciles every fifteen minutes, subject to GitHub
scheduling availability, using the existing repository Actions token. It writes
`apps/web/public/content-studio-last-known-good.json` on the dedicated
`data/content-studio-recovery` branch. This branch contains exactly that public
snapshot and `vercel.json` with all deployment disabled. Its first commit has no
application-code ancestry; later commits append to recovery history. Nothing
checks out or executes data-branch code. Normal non-forced pushes reject competing
updates; a changed head or unexpected branch file/configuration fails closed.

This is generated recovery data, not a second editorial store. Do not edit it,
merge it into main, create a content PR, or deploy the branch. Each snapshot does
not need an application release or a coordinator admission slot. Protected-main
rules and all three required exact-head gates remain unchanged for code releases.
The existing release coordinator owns deployment of this implementation in its
combined candidate; the publisher has only contents write permission, and never
creates PRs, attests checks, changes admission, approves runs or merges main.
No additional credential or GitHub App is required.

GitHub documents that GITHUB_TOKEN pushes do not recursively trigger Actions
push workflows: https://docs.github.com/en/actions/concepts/security/github_token.
Vercel supports explicitly disabling branch/all automatic deployment in vercel.json:
https://vercel.com/docs/project-configuration/git-configuration.
Both the main configuration's named branch rule and the data tree's own global
false setting disable deployment for this recovery branch.

## Export and recovery guarantees

The exporter uses the controlled public reader, never raw authoring tables. It
keeps complete durable reader passages, exact per-key publication identity and
version, and retirement records including deleted rows. Drafts, dated editions,
private feedback, writer provenance and authoring history stay out of this public
backup. Their protected backup is a separate responsibility. Existing configured
identifier redaction remains mandatory; other reader wording is preserved.

A complete ledger is read before and after export. Changed ledger, missing
sentinel, pagination failure, duplicate keys, nonadvancing cursor, mismatched
publication identities or an implausible row-count drop rejects replacement.
The previous recovery copy is used as the metadata/no-op and row-drop baseline.
Manual dispatch forces full export; unchanged scheduled reconciliations only read
publication metadata. A publication after export is picked up on the next run.
The exact two-file tree is built separately from the trusted source checkout;
source bytes are restored even if export, validation or delivery fails.

The app tries the public GitHub recovery snapshot when it needs fallback rows,
then the packaged static snapshot if GitHub times out, is unavailable or returns
invalid data. Both pass the same public-field, lifecycle and exact publication
identity checks before installation. Existing atomic row/ledger installation,
newer-version precedence and retirement protections apply to both sources.
The packaged copy remains available independently of GitHub; an offline client
can only use previously available rows and known retirements until reconnecting.
Recovery updates do not replace live Studio reader responses or activate drafts.
The main-branch JSON file is the packaged release baseline, not a live mirror;
inspect the data branch for the latest synchronized publication revisions.

## Verification and operation

Run `node scripts/test-content-studio-last-known-good.mjs`,
`node scripts/test-content-studio-snapshot-sync.mjs` and
`node --import tsx scripts/test-offline-publication-install.mts`.
These cover real local Git data trees and append-only history, no-op and retirement
updates, export failure/restoration, public projection and invalid source refusal,
GitHub-to-packaged fallback, full passage installation, newer publication precedence
and retirement preservation. Local fixtures are not hosted delivery evidence.

Before calling the release live, the combined exact head must pass the normal
API, browser and privacy gates, deploy through main's Git integration, and pass
affected production acceptance. Dispatch the new workflow on deployed main; verify
its real successful data commit, exact two-file tree, deployment disabled, complete
selected approved Chiron fields and retirement ledger, then verify a second
unchanged reconciliation creates no extra commit. Exercise the deployed reader's
GitHub recovery and packaged failover separately without mutating owner content.
A scheduled GitHub delay is not a publication failure; a failed sync remains a
visible failed workflow and preserves the previous branch head. Retry only after
fixing the concrete cause. Never use a raw source exporter or package-to-Studio
materializer to repair a public recovery copy. Review obsolete run-number snapshot
PRs as superseded after the first verified replacement release.
