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

A bounded owner batch authorization is a separate promotion authority for already-authored,
hash-bound payloads. It never authorizes a rewrite. The promoted field must already match the
exact SHA-256 recorded for that explicitly named batch member.

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
The default path remains unchanged: document-level approval can advance wording to
`owner-approved` or `owner-locked`, while `batch_generation` and `serving` remain false until
the exact staged product sample advances from `owner-review-pending` to `owner-approved`
through an explicit owner ruling.

The final cold-rendered-prose TRAIN/HOLDOUT calibration rejected an owner-approved gold.
Accordingly, semantic cold-review findings are permanently advisory-only and cannot authorize
or deny any transition. Cold prose judgment is an owner gate by design.

## Bounded contextual owner batch authorization (owner-directed implementation amendment, 2026-09-03)

An explicit owner statement may approve a bounded batch without requiring the owner to repeat
an identical ruling once per row. This is an alternative owner-evidence path, not an AI or
pipeline approval path and not a wildcard approval mechanism.

A bounded batch authorization is valid only when a governed evidence record contains all of
the following:

- `authority: "owner"` and `decision: "approve"`;
- the owner's exact statement, preserved as evidence rather than paraphrased by a model;
- a stable, non-wildcard `batchId`;
- the exact product `surface` and exact approved field;
- explicit capabilities, with `serving` permitted only when `batch_generation` is also explicit;
- an explicit member list with no wildcard content keys; and
- an exact SHA-256 for the approved payload of every member.

Promotion is evaluated one member at a time. The member content key must appear in that list,
and the current payload hash must equal the hash recorded for that member. A missing member,
duplicate member, changed payload, field mismatch, surface mismatch, or scope expansion fails
closed. Authorization for one batch does not transfer to a neighboring row, another field,
another surface, a later rewrite, or a newly generated variant.

`owner directed`, `owner requested completion`, a model PASS, judge score, pipeline status,
AI-authored note, or assistant inference is not a bounded owner batch approval. Those facts may
be provenance, but they cannot set `owner-approved`, authorize serving, or manufacture the
owner statement. Only owner-originating approval evidence may enter the canonical batch
authorization record.

The existing exact rendered-sample path remains the preferred/default path and remains valid
without modification. The bounded batch path exists for cases where the owner explicitly
approves a named corpus or batch in context and that approval can be frozen against an exact,
fully enumerated payload set.
