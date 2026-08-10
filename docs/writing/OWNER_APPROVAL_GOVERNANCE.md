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
