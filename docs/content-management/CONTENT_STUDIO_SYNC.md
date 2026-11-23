# Content Studio and GitHub synchronization

Content Studio is the editorial source of truth. Saving a draft never changes the
published version. Normal version-checked owner publication updates the reader
and its publication ledger; this workflow neither approves nor writes Studio rows.
Original imports in the application repository remain historical source evidence.
Resolve the current Studio publication or its generated recovery copy before
proposing a content change; never restore old wording over newer approved writing.

## Automatic GitHub synchronization

The trusted-main workflow reconciles every fifteen minutes, subject to GitHub
scheduling availability, using the existing repository Actions token. It writes
two consistent public snapshots in one commit on the dedicated
`data/content-studio-recovery` branch:

- `content-studio-published.json` contains the complete current public-reader
  inventory, including dated Sky articles, horoscope editions, Calendar writing,
  standalone articles, education and reusable reader passages. There is no
  exporter prefix, provider, period or current-date allowlist. New families
  admitted by the public reader enter the archive automatically.
- `apps/web/public/content-studio-last-known-good.json` remains the smaller,
  undated durable recovery view used by the app. The complete archive is outside
  the app's public directory and is never installed as current fallback writing.
- `vercel.json` disables all deployment for the data branch.

The branch contains exactly these three regular data files. The publisher accepts
and upgrades the existing two-file recovery tree without rewriting its history.
Its first commit has no
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
keeps complete published reader passages and their saved row IDs, versions,
content keys, dates and modes, together with the complete retirement ledger.
Dated editions remain included after their reading window ends while they are
still published; an already-released future reading date is included too. A
scheduled article enters only when the public reader releases it. Multiple dates
or modes under the same key remain separate archive rows. Reusable undated rows
must match their exact live ledger identity. Dated instances follow the reader's
existing lifecycle rules and retain their own saved row versions; the reusable-key
ledger does not pin each dated instance.

Drafts, unapproved replacements, private reports, private feedback, writer
provenance and authoring history stay out of this public backup. Their protected
backup is a separate responsibility. The public reader remains the admission
authority; this exporter does not grant editorial approval. Existing configured
identifier redaction remains mandatory; other reader wording is preserved.

A complete ledger is read before and after export. Two complete controlled-reader
enumerations must agree, catching dated edits, deletions, added editions and timed
releases that do not change the reusable-key ledger. Changed inventory or ledger,
missing sentinel, pagination failure, duplicate row IDs or instance identities,
nonadvancing cursor, mismatched publication identities or an implausible row-count
drop rejects replacement. Previous snapshots provide the row-drop baselines.
Both scheduled runs and manual dispatch enumerate all published writing; identical
validated artifacts create no extra commit. The legacy recovery-only CLI may
still skip unchanged ledger metadata, but the automatic complete publisher never
uses that shortcut. A publication after export is picked up on the next run.

Unpublished or deleted dated instances disappear from the current archive; earlier
public versions remain in Git history. Reusable retirements retain their ledger
records even after source deletion. Both artifacts share the same ledger and are
delivered atomically in one Git tree, built separately from the trusted source
checkout; source bytes are restored even if export, validation or delivery fails.

The app tries the public GitHub recovery snapshot when it needs fallback rows,
then the packaged static snapshot if GitHub times out, is unavailable or returns
invalid data. Full public-field projection is verified by the trusted publisher
before delivery. Both recovery sources pass structure, lifecycle and exact
publication identity checks before installation. Existing atomic row/ledger installation,
newer-version precedence and retirement protections apply to both sources.
The packaged copy remains available independently of GitHub; an offline client
can only use previously available rows and known retirements until reconnecting.
Recovery updates do not replace live Studio reader responses or activate drafts.
The main-branch JSON file is the packaged release baseline, not a live mirror;
inspect the data branch for the latest synchronized publication revisions.

## Verification and operation

Run `node scripts/test-content-studio-last-known-good.mjs`,
`node scripts/test-content-studio-snapshot-sync.mjs`,
`node scripts/test-content-studio-published-export.mjs` and
`node --import tsx scripts/test-offline-publication-install.mts`.
These cover real local Git data trees and append-only history, no-op and retirement
updates, complete dated/undated exports, timed release, repeated keys across dates,
dated edit/deletion, stable enumeration, export failure/restoration, public
projection and invalid source refusal,
GitHub-to-packaged fallback, full passage installation, newer publication precedence
and retirement preservation. Local fixtures are not hosted delivery evidence.

Before calling the release live, the combined exact head must pass the normal
API, browser and privacy gates, deploy through main's Git integration, and pass
affected production acceptance. Dispatch the new workflow on deployed main; verify
its real successful data commit, exact three-file tree, deployment disabled, complete
selected approved Chiron fields, complete dated edition passages and retirement
ledger, then verify a second unchanged reconciliation creates no extra commit.
Exercise the deployed reader's
GitHub recovery and packaged failover separately without mutating owner content.
A scheduled GitHub delay is not a publication failure; a failed sync remains a
visible failed workflow and preserves the previous branch head. Retry only after
fixing the concrete cause. Never use a raw source exporter or package-to-Studio
materializer to repair a public recovery copy. Review obsolete run-number snapshot
PRs as superseded after the first verified replacement release.
