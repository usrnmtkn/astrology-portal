# Generated Friends / You report release contract

New Friends readings and You Day/Week reports follow this release path:

1. Generate from the governed report brief.
2. Pass deterministic fact-lock and writing validation.
3. Run the generated-report judge using Report Judge v3.4 plus the short-report adapter.
4. If the first judge passes, persist the report and a pass-only quality audit.
5. If the first judge blocks, perform exactly one corrective rewrite using those run-local findings and the same governed brief.
6. Re-run deterministic validation.
7. Re-judge once.
8. Persist only if that second judgment passes. Otherwise reject that draft and retry the existing job while its attempt budget remains. Show Needs attention only when the job exhausts that budget.

Each You Day/Week and Friends job gets four attempts by default, controlled by `YOU_REPORT_JOB_ATTEMPT_CAP` and `FRIEND_REPORT_JOB_ATTEMPT_CAP`. A judge rejection can retry immediately within the existing worker deadline; other retryable failures use two minutes per attempt (capped at 30 minutes). Cron workers pick up eligible work. The report remains generating between attempts. Rejected drafts may remain in protected model checkpoints, but are never published as reader results.

Retries reuse the same job, active entitlement, target date, and locked factual brief. They do not create another purchase, although fresh provider calls incur model cost. Every attempt runs the governed generation and validation path, with bounded deterministic correction, at most one judge-directed rewrite and two judgments. Revoked or refunded entitlements cancel the job before generation. Completed reports are reused rather than regenerated.

The immediately preceding logical attempt can supply its latest completed draft and current deterministic validation errors as correction data. Its latest judge findings apply only when that judge ran after the latest writer step; an older judgment must not diagnose a newer unjudged revision. This context comes from immutable checkpoints scoped to the same job, never another report or mutable `last_error`. It is not factual evidence, owner approval, or reusable writing guidance. The new draft must pass every current check. Final deterministic recovery receives the latest draft and revises it against the reduced governed brief instead of starting over.

The shared `TLDR-GENERATED-REPORT-BREADTH-AND-VOICE-V1.md` contract is loaded into the initial writer, deterministic recovery, corrective writer, and judge prompts. It requires mechanism → breadth → evidence filtering → source-supported example/category → outcome check. The judge emits `over_specification` for unsupported consequential outcomes; the runtime blocks any such finding independently of the numeric score. The existing two-judge limit remains unchanged. Report prose must develop recognizable experience and consequence using governed owner language instead of abstract synthesis or an optimistic stock ending.

Draft Review feedback is stored in `generated_report_owner_feedback` as `candidate` by default. Candidate and rejected feedback never enters future writer or judge calls. The owner must explicitly choose **Approve as owner evidence**, supply the governed evidence wording, and choose its scope. Only approved `governed_evidence_text` is loaded into future generated-report packets.

Existing completed Friends/You reports are grandfathered and are not retroactively re-judged.
