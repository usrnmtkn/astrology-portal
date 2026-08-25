# Owner approval governance

Owner-authored, verbatim, 2026-08-09.

Do not confuse:
- generated
- model-reviewed
- pipeline-passed
- owner-approved
- owner-locked

Use distinct statuses.

Recommended states:

generated
pipeline-review-passed
owner-review-pending
owner-approved
owner-locked

A model PASS is not owner approval.

A Codex edit is not owner approval.

A judge score is not owner approval.

Only an explicit owner ruling may set:
owner-approved
or
owner-locked

Never silently rewrite owner-locked copy.

## Governed promotion transaction

Owner approval and serving promotion remain separate events. An approval queue item may
declare a machine-readable `promotion` target only when the owner decision supplies the
complete replacement text for one field. Partial span edits, inferred rewrites, and decisions
without exact owner text are not executable promotions.

Run `npm run content:promote-approved -- --application=<application.json>
--receipt=<receipt.json>` first. This is a dry run: it verifies the exact source field hash,
the JSON pointer, the content key, the approval record path, and the single-file transaction
boundary, then writes a receipt containing `planSha256` without touching source content.

Applying the transaction requires an explicit second command with `--write` and
`--expected-plan-sha256=<dry-run hash>`. If the plan or source file changed, it fails closed.
The source JSON update uses a same-directory atomic rename and records before/after hashes,
the exact field diff, the base commit, and an empty unrelated-approved-row change list. One
transaction deliberately supports only one source JSON file so a crash cannot leave a
multi-file serving change partially applied. Generated bundles and integrity checks run after
the source transaction through the normal isolated-worktree gate.

Every promoted text field also receives a template-slot preflight. Existing slots are the
default allowed and required contract: adding an unknown slot, removing a required slot, or
leaving malformed braces fails before source is written. Added slots must already exist in the
same fallback-hook family contract. A queue target may narrow that set with an exact
`slotContract` when an approved change intentionally changes the contract. Friends Daily
Glance `body_they` fields additionally use the runtime person-slot allowlist, observer-copy
lint, and rendered she/her, he/him, and they/them fixtures. The dry-run receipt stores the
before/after slot sets and fixture outputs so variable behavior is reviewable with the prose.

The generated approved serving projection references
`approved-serving-lineage-v1.json`. That governance-only file records each emitted partition
row's hash, authoring source path and JSON pointer, declared source keys, review status, and
exact-approval record. Reader runtime does not import this metadata.

## Rendered-sample transition gate (owner-authored, 2026-08-11)

The executable transition contract is `data/writing/approval-status-transitions.json`.
Document-level approval can advance wording to `owner-approved` or `owner-locked`, but both
`batch_generation` and `serving` remain false until the exact staged product sample advances
from `owner-review-pending` to `owner-approved` through an explicit owner ruling.

The final cold-rendered-prose TRAIN/HOLDOUT calibration rejected an owner-approved gold.
Accordingly, semantic cold-review findings are permanently advisory-only and cannot authorize
or deny any transition. Cold prose judgment is an owner gate by design.
