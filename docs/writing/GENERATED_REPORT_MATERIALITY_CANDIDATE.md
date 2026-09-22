# Generated-report materiality candidate and bounded repair

Status: implementation candidate, inactive, not owner-approved for release.
Policy identifier: `report-materiality-candidate-v1`.
Scope: You Day, You Week and Friends generated readings. Premium reports unchanged.
Authority: September 22 owner request to rework and fix the strategy in task
`thread:01a0c440-92d0-7822-bda6-af3338840786`. This authorizes implementation;
it does not approve a new writing rubric or additional paid calls.

## Deliverable 1: stop repeated correction cycles

A completed second rejection is terminal for automatic generation, even when
four infrastructure attempts remain. Malformed judge evidence is an evaluation
failure and never directs a writer. An outage after a valid first rejection
also holds the report, so infrastructure recovery cannot reset the correction
allowance. A normal checkpoint time yield resumes the same saved steps.
Failures before a usable initial judgment retain bounded infrastructure recovery.

Held reports keep their job, entitlement, locked inputs and protected checkpoints.
No rejected text becomes reader-ready. The library says **Needs review**; its
reader does not direct the user to retry. HTTP re-request returns 409 with
`needs_review` and dispatches no worker. Cron cannot claim the failed job.
Legacy failed or retrying jobs whose recorded error identifies a completed
correction/re-judge cycle are also held before any new model dispatch. Other
failed jobs retain the existing explicit user-retry behavior. Completed reports
are reused. Nothing in this implementation cancels a purchase or issues a refund.

This operational repair preserves the approved strict release gate and can be
reviewed independently of the policy experiment below. It bounds a failure;
it does not establish that the judgment was correct or make the report available.

## Deliverable 2: a separately versioned decision policy

The default is `GENERATED_REPORT_RELEASE_POLICY=strict`. Selecting the exact
candidate identifier is required to exercise it. Unknown values fail closed.
The candidate permits only the combined reviewer. The failed scoped experiment
remains inactive; its migration and extra calls are not required by this candidate.
Writer/model, judge prompts, approved corpus, rubrics and source documents are
unchanged. The candidate changes how validated scores determine release:

| Evidence after ordinary schema/citation checks | Candidate decision |
| --- | --- |
| Ordinary editorial category scored 3 | Advisory; does not instruct a rewrite |
| Any editorial category scored 0–2 with a finding | Material; one correction |
| Either factual category below 4 with a finding | Factual blocker; one correction |
| Unsupported interpretation, timing, over-specification, narrative repetition or explicit owner-language finding | Always blocking |
| Material/factual score lacks a finding, unknown/fractional score, perfect score contradicts a finding | Review required; no rewrite |
| No blocker but aggregate below 0.85 | Review required; no invented rewrite diagnosis |
| No blocker, valid review and aggregate at least 0.85 | Accept under candidate policy |
| A corrected report still fails or cannot be reviewed | Review required; no new quality cycle |

The 0–4 semantics originate in Report Judge v3.1; v3.3 describes voice 3 as
minor drift. Nevertheless, the approved September 7 short-report adapter
requires voice and natural language 4. Accepting a 3 is therefore an explicit
policy change, not a bug fix or an already-approved interpretation. The candidate
also strengthens other category floors; it is not only a relaxation.

Corrections receive blocking findings only. Saved audits preserve the original
strict verdict, nine scores, advisory and blocking findings, policy version and
exact final draft hash. A candidate pass is not recorded as a strict pass.
Default checkpoint request hashes remain byte-compatible. Candidate hashes
include the policy identifier; switching policies cannot reuse old judgments.
The selector is pinned during an invocation. Invalid settings cause no paid call.

## Evidence and current decision

A zero-call counterfactual replays existing, unmodified, private results. It is
not a new judgment or independent calibration:

| Archived evaluator | Accepted controls accepted by candidate | Remaining disagreement |
| --- | --- | --- |
| v1.7 combined, two judgments per control | 4/6 judgments, covering 2/3 controls | C01 still blocked in both runs |
| v1.8 scoped, one judgment per control | 1/3 controls | C01 and C02 still blocked |

C03 was acceptable in isolation but less preferred than C04; accepting it is
not by itself a false acceptance. The C01 source-support dispute remains
unadjudicated. An exact citation and a plausible explanation do not prove that
an objection is true. No Friends calibration or new in-app report was performed.

**Decision now: do not activate the candidate or call the judge fixed.** The
retry defect has an offline repair. The evaluator still disagrees with owner
judgments. No automatic next prompt revision, extra model, or paid rerun follows.

## One bounded release evaluation, if separately authorized

1. Freeze the candidate code/policy hash, combined-review model, evidence packet
   and source rules before dispatch. Approval must name this policy version.
2. Assemble nine independent complete reports: an acceptable, materially weak
   and factually unsupported case for each of Day, Week and Friends. Establish
   owner editorial labels and independently reviewed exact source-support labels
   before revealing model results. Labels stay out of provider prompts. The four
   development reports cannot count as this held-out set. If these labels or
   inputs are unavailable, stop as **not evaluated**; do not substitute guesses.
3. Reserve at most 18 combined judge calls, two per held-out case, with no model
   retries or provider fallback. Preflight worst-case tokens at verified rates
   and require an explicit call extension; the existing 42-call allowance is
   exhausted. Total spending across all batches must remain within $5. If the
   reservation does not fit, stop before dispatch; elapsed time is not consent.
4. Require both judgments of every acceptable case to accept and both judgments
   of every negative case to identify its pre-labeled defect and block. Any
   unsupported factual objection, missed factual defect, invalid review or
   repeat disagreement fails this small-set gate. Relative ranking is not used
   to declare absolute acceptability; the prior weekly preference contradiction
   stays recorded. These small-set results cannot estimate population error rates.
5. Only after that gate passes, separately prepare and reserve real Day, Week and
   Friends generation with this exact code and sources, up to seven calls each
   (maximum 21, no automatic extra attempts). Verify returned draft, correction
   if any, final audit, saved row, reader opening/ending, latency and actual cost.
   The owner must accept each complete final report; a model pass is insufficient.
   Missing, held or weak output fails verification. No report is generated merely
   to spend the remaining allowance.
6. Execution deadline: 90 minutes after approved inputs, policy, call allowance
   and credentials are ready. Stop at the first failed acceptance check, deadline
   or spend reservation. Keep the strict gate active; mark the candidate failed
   or inconclusive and close the batch. Do not tune and rerun the same cases.
   A later candidate is a new owner decision, not continuation of this plan.

The maximum proposed extension is 39 calls across two conditional stages, not
an authorization or a promise that this fits the remaining dollars. No call
reservation or dispatch was made during this implementation. Prior observed
spending is $1.833885, leaving $3.166115 of the combined cap; unreported or
ambiguous usage must be reconciled before any later reservation.

## Release and recovery

Before any merge/release: current main, required API/type/privacy checks, fresh
built reader verification and applicable paid evidence must be recorded. Activate
only the explicitly approved artifact. A production claim additionally needs a
main-branch deployment and authenticated reader verification. No direct feature
branch production deployment or approval promotion is part of this work.

Rollback leaves the policy unset/strict. It does not clear review holds or rewrite
completed reports. Requests under another policy fail checkpoint identity checks.
For a held job, an operator first reviews the exact frozen brief, current draft,
findings and entitlement, records a concrete resolution and authorized budget,
and then schedules one new reviewed attempt with a new checkpoint-attempt number.
Do not bulk-reset failed jobs, erase their history, mark them complete manually,
or consume another customer purchase. Without a reviewed resolution the job stays
held. This is a bounded operational fallback, not a promise of manual fulfillment.
