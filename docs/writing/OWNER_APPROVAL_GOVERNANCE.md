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

## Rendered-sample transition gate (owner-authored, 2026-08-11)

The executable transition contract is `data/writing/approval-status-transitions.json`.
Document-level approval can advance wording to `owner-approved` or `owner-locked`, but both
`batch_generation` and `serving` remain false until the exact staged product sample advances
from `owner-review-pending` to `owner-approved` through an explicit owner ruling.

The final cold-rendered-prose TRAIN/HOLDOUT calibration rejected an owner-approved gold.
Accordingly, semantic cold-review findings are permanently advisory-only and cannot authorize
or deny any transition. Cold prose judgment is an owner gate by design.
