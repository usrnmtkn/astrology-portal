# Generated Friends / You report release contract

New Friends readings and You Day/Week reports follow this release path:

1. Generate from the governed report brief.
2. Pass deterministic fact-lock and writing validation.
3. Run the generated-report judge using Report Judge v3.4 plus the short-report adapter.
4. If the first judge passes, persist the report and a pass-only quality audit.
5. If the first judge blocks, perform exactly one corrective rewrite using those run-local findings and the same governed brief.
6. Re-run deterministic validation.
7. Re-judge once.
8. Persist only if that second judgment passes. Otherwise hold the report for review. Do not repeat the quality cycle using the infrastructure attempt budget.

The September 22 bounded-recovery repair is implemented on the repair branch,
not yet deployed. You Day/Week and Friends retain four infrastructure attempts
by default (`YOU_REPORT_JOB_ATTEMPT_CAP` / `FRIEND_REPORT_JOB_ATTEMPT_CAP`), with
two minutes per attempt of backoff, capped at 30 minutes, before a usable initial
review. A completed second rejection, malformed evaluation, or failure after
quality correction begins now stops automatic work. A checkpoint time yield
continues the same immutable attempt. Re-requesting a held report returns
`needs_review` without resetting its allowance. Legacy completed-rejection
retries stop before dispatch. See the [bounded repair and inactive policy
candidate](writing/GENERATED_REPORT_MATERIALITY_CANDIDATE.md) for exact decisions,
limits, evaluation evidence and recovery disposition.

Retries reuse the same job, active entitlement, target date, and locked factual brief. They do not create another purchase, although fresh provider calls incur model cost. Every attempt runs the governed generation and validation path, with bounded deterministic correction, at most one judge-directed rewrite and two judgments. Revoked or refunded entitlements cancel the job before generation. Completed reports are reused rather than regenerated.

The immediately preceding logical attempt can supply its latest completed draft and current deterministic validation errors as correction data. Its latest judge findings apply only when that judge ran after the latest writer step; an older judgment must not diagnose a newer unjudged revision. This context comes from immutable checkpoints scoped to the same job, never another report or mutable `last_error`. It is not factual evidence, owner approval, or reusable writing guidance. The new draft must pass every current check. Final deterministic recovery receives the latest draft and revises it against the reduced governed brief instead of starting over.

The shared `TLDR-GENERATED-REPORT-BREADTH-AND-VOICE-V1.md` contract is loaded into the initial writer, deterministic recovery, corrective writer, and judge prompts. It requires mechanism → breadth → evidence filtering → source-supported example/category → outcome check. The judge emits `over_specification` for unsupported consequential outcomes; the runtime blocks any such finding independently of the numeric score. The existing two-judge limit remains unchanged. Report prose must develop recognizable experience and consequence using governed owner language instead of abstract synthesis or an optimistic stock ending.

Draft Review feedback is stored in `generated_report_owner_feedback` as `candidate` by default. Candidate and rejected feedback never enters future writer or judge calls. The owner must explicitly choose **Approve as owner evidence**, supply the governed evidence wording, and choose its scope. Only approved `governed_evidence_text` is loaded into future generated-report packets.

Existing completed Friends/You reports are grandfathered and are not retroactively re-judged.

## Experimental scoped review (inactive)

The September 22 repair implements an opt-in candidate under
`GENERATED_REPORT_REVIEW_MODE=scoped`. The default remains `combined`. It has
not passed live editorial calibration and is not approved for activation.
The candidate assigns astrology/chronology and factual traceability to the
facts reviewer; the writing reviewer owns the other seven scores. Each
reviewer has a separate prompt, schema, checkpoint and receipt tied to the
same exact reader-visible draft. Neither receives the other's judgment.
The facts packet excludes owner prose exemplars. The writing packet includes
approved reader meaning, not the technical inventory, and requires complete
paragraph context plus the reader consequence for each finding.

The existing threshold, category floors and blocking findings still apply.
The runtime assembles the nine separately owned scores; it does not average
two competing opinions. Missing, malformed or wrong-draft output is an
evaluation failure, not a diagnosis that the writing failed.

This mode uses two review calls per round and at most two rounds per logical
attempt: four review calls plus the existing maximum five writer calls.
Corrections invalidate both reviews. Each reviewer has a two-call ceiling;
unused writer or review slots cannot be transferred to another role. The
default combined mode retains seven total steps. The prepared migration
`20260922215546_transit_report_scoped_review_steps.sql` permits slots 0–8 and
must be applied and verified before scoped activation. It changes no stored
draft, response, ownership, permission, or approval status. No production
environment setting or database migration has been applied by this repair.

Activation requires the separate calibration and release review described in
[the scoped-review proposal](writing/GENERATED_REPORT_SCOPED_REVIEW_PROPOSAL.md),
including the increased per-job cost, held-out owner-labeled cases, real
daily/weekly/Friends runs and saved-reader verification. Offline fixture
passes alone do not authorize activation. Switch modes only for new reviewed
attempts; existing checkpoints reject changed request hashes instead of
silently reusing a judgment made under another mode.
