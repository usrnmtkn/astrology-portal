# Project privacy

The source repository is private. A private repository does not make deployed
JavaScript, static downloads, browser responses, or previous deployments private.
Review these boundaries separately before every release.

Personal source documents live in protected storage. Four report references use
neutral `private:report/…` identifiers and SHA-256 integrity checks. The server
reads `PRIVATE_REPORT_DOCUMENTS` from the deployment secret store. Local work
uses the ignored `.private-documents/reports.json`. These original documents
must never be copied into Git, browser assets, logs, test attachments, or PRs.
Source integrity hashes remain those of the complete original documents.

Original database content records are archived in the restricted
`project_privacy.content_archive` table before identifier removal. The schema
and table deny access to `anon` and `authenticated`, and the table has RLS with
no client policies. Privacy maintenance preserves all other fields and checks
that publication triggers do not introduce unrelated changes. Public content
must be checked independently of the repository and static snapshot.

The identifying values in `PROJECT_PRIVACY_POLICY` are maintained privately.
CI obtains the policy from an Actions secret. Local work uses the ignored
`.privacy-policy.json`, or `PROJECT_PRIVACY_POLICY_FILE` pointing outside Git.
Never document the protected values in the rule itself or in a failing test.
Missing policy fails closed. Tests use fictional identifiers.
ZIP and Office archives are inspected recursively with bounded decompression,
including XML text runs. This check requires Python 3 and fails closed if an
archive cannot be inspected. Original source workbooks remain in protected
storage; their exact hashes and extracted canonical rows preserve provenance.

For a fresh clone, provision the private policy through the owner's protected
storage, then run `git config --local core.hooksPath .githooks`.
Run `npm run privacy:check` before committing. The pre-commit hook checks staged
bytes, and the pre-push hook also checks intermediate commits and identities.
Check `apps/web/dist` with the scanner's `--directory` option before release.
The public snapshot exporter redacts only configured identifiers and preserves
the remainder of complete reader passages.

Local hooks and CI are safeguards, not an access boundary. Hooks can be bypassed;
private-repository required checks depend on the GitHub account's plan. Keep
repository access restricted and enable mandatory privacy checks when available.

Calculation integration tests use an explicitly fictional birth profile. Do not
restore real user profiles to tests to reproduce a bug. Use generated or minimal
synthetic cases, and preserve direct ephemeris checks for calculation behavior.

After a privacy history rewrite, clone the cleaned repository afresh. Preserve
uncommitted work outside Git, inspect it with the private policy, then reapply
only the needed patch. Never merge or push an old clone's history into the
cleaned repository. Old local backups remain private recovery material.
Provision the privately archived retired commit list with
`git config --local projectPrivacy.retiredCommitsFile /protected/path/retired-commits.txt`.
The push guard checks the full ancestry against that list, even when an old
worktree still has stale remote-tracking refs. Keep this setting in fresh clones.

Agents must check memory source paths after source moves, regenerate affected
indexes, verify complete text and provenance, and check that deployed memory
endpoints still require owner access. Check public downloads independently of
the admin graph. Follow the existing content and technology freshness direction
in the memory runbook; a local rebuild alone does not update production.
