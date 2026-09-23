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

### Correction reconciliation (adapter v1.9, repair branch)

The initial combined review is instructed to finish checking the TLDR, every
paragraph, their connections and the ending before emitting its findings.
The final combined reviewer receives the original draft and review alongside
the current complete draft, with exact field/paragraph change receipts. It must
account for every earlier finding as resolved, still present or withdrawn, and
classify every current finding as unresolved, introduced by an edit, previously
missed, or caused by changed context. An unchanged quote cannot be labeled newly
introduced; changed context requires an exact newly edited supporting quote.

Accounting, finding indices, quote identity and previous/current draft hashes
are validated. Missing or contradictory accounting is an evaluator failure and
holds the report; it does not instruct another writer call. Pass audits retain
the reconciliation receipt. A previously missed factual or editorial defect
still uses the unchanged strict release rules. This is not a score floor change,
permission to ignore a new defect, or a guarantee of complete/stable model review.
The origin classification checks textual identity, not semantic causality.

The scoped experiment is unchanged and inactive. The combined reviewer keeps
the same two-review/one-quality-correction ceiling. Changed prompts/schema
invalidate old checkpoint request identities; historical held jobs are neither
reset nor replayed automatically. Real-provider verification is required before
release; fixture checks only establish protocol and lifecycle behavior.

### Exact source references (adapter v1.10, repair branch)

The combined provider schema now asks for `sourcePath`, restricted to the exact
string-field pointers in the locked brief, instead of a model-copied
`sourceQuote`. Runtime attaches the complete original string byte-for-byte and
then applies the existing evidence, score/finding and release validation. The
raw response remains unchanged. Missing, non-string or unknown references fail;
an unexpected provider `sourceQuote` also fails rather than being silently
replaced. A null reference still means missing support or a style-only finding.

This avoids paraphrases masquerading as exact source quotations. It does not
prove that the selected source supports the diagnosis, approve a factual claim,
or waive the unchanged draft/owner comparison quotation checks. The legacy and
inactive scoped schemas retain exact-quote validation. A bounded real v1.10
Daily run accepted the initial review and reached the corrective writer and
final review. The final response resolved source references successfully but
failed reconciliation metadata validation; no ready report was persisted.
Weekly and Friends were not dispatched after that stop.

### Redundant change evidence (adapter v1.11, repair branch)

The observed final reviewer correctly classified new quotations as introduced
by the edit, but also repeated each `draftQuote` in `changeQuote`. The previous
validator required null and rejected otherwise consistent accounting. An
introduced finding now permits null or a byte-identical duplicate of its
validated `draftQuote`. Different, invented or unchanged quotations remain
invalid. Changed-context findings still require separate newly edited evidence;
unresolved and previously missed findings still require null.

This changes metadata acceptance only. The raw response, scores, findings,
strict release floors and call limits are preserved. The saved real response
still contains blocking findings after metadata validation. Offline replay is
not a new model judgment, owner approval or successful report generation;
release verification remains incomplete.

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
