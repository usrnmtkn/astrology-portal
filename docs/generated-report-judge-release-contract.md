# Generated Friends / You report release contract

New Friends readings and You Day/Week reports follow this release path:

1. Generate from the governed report brief.
2. Pass deterministic fact-lock and writing validation.
3. Run the generated-report judge using Report Judge v3.4 plus the short-report adapter.
4. If the first judge passes, persist the report and a pass-only quality audit.
5. If the first judge blocks, perform exactly one corrective rewrite using those run-local findings and the same governed brief.
6. Re-run deterministic validation.
7. Re-judge once.
8. Persist only if that second judgment passes. Otherwise keep the report blocked / Needs attention.

Judge findings are not persisted as reusable writing evidence. They exist only to repair the draft that produced them.

The shared `TLDR-GENERATED-REPORT-BREADTH-AND-VOICE-V1.md` contract is loaded into the initial writer, deterministic recovery, corrective writer, and judge prompts. It requires mechanism → breadth → evidence filtering → source-supported example/category → outcome check. The judge emits `over_specification` for unsupported consequential outcomes; the runtime blocks any such finding independently of the numeric score. The existing two-judge limit remains unchanged. Report prose must develop recognizable experience and consequence using governed owner language instead of abstract synthesis or an optimistic stock ending.

Draft Review feedback is stored in `generated_report_owner_feedback` as `candidate` by default. Candidate and rejected feedback never enters future writer or judge calls. The owner must explicitly choose **Approve as owner evidence**, supply the governed evidence wording, and choose its scope. Only approved `governed_evidence_text` is loaded into future generated-report packets.

Existing completed Friends/You reports are grandfathered and are not retroactively re-judged.
