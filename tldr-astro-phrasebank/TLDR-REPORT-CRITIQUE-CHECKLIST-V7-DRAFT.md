# Report critique checklist v7 draft

**Status:** `needs_review`
**Version:** `report-critique-checklist-v7-draft`
**Owner approved:** `false`
**Active in production:** `false`
**Promotion authorized:** `false`
**Baseline:** `report-critique-checklist-v6`
**Amendment source:** `TLDR-REPORT-NATURALNESS-RULING-OWNER.md`, awaiting owner approval.
**Governance:** Candidate v7 amendment layered over the active v6 checklist. V6 remains active. This draft cannot be activated or promoted without fresh SHA-pinned owner approval.

The complete v6 checklist remains in force. Add the following naturalness-and-restraint pass.

## Naturalness diagnostics

Run these four named diagnostics after factual, specificity, clarity, and earned-sentence checks:

1. `constructed_phrasing`: a normal person could understand the sentence but probably would not say it that way. Route a supported finding to `unnatural_phrasing`.
2. `double_hedging`: the first clause already carries uncertainty and the consequence is needlessly hedged again. Route a supported finding to `unnatural_phrasing` or `density_violation`, according to the actual defect.
3. `abstract_proof_language`: proving, demonstrating, embodying, or maintaining replaces the observable behavior or test. Route a supported finding to `unnatural_phrasing` or `owner_voice_drift` with comparison evidence.
4. `vagueness_that_matters`: the missing object or action materially impairs comprehension even though the chart supports naming the work, task, cost, schedule, or responsibility. Route a supported finding to `unnatural_phrasing`.

These diagnostics do not create new defect enums. Return only governed categories.

## Judging restraint: do not flag

Run these four named restraint diagnostics. Do not return a finding when one applies:

1. `landed_compact_rhetoric`: concise rhetoric, contrast, or metaphor that lands immediately and sharpens a consequence;
2. `clear_pronoun_antecedent`: a pronoun whose antecedent is obvious in the surrounding paragraph;
3. `maximum_useful_specificity`: a sentence that has reached maximum useful specificity in context;
4. `stop_after_landing`: a strong line after it lands. Do not demand explanatory prose after it.

Pronoun findings are contextual, never mechanical. A pronoun is eligible only when the referent is genuinely unclear in the complete paragraph.

## Labeled naturalness evidence

### Negative: constructed phrasing

`naturalness-negative-open-statement`: “You can be earning more and still open the statement to nearly the same balance.”

### Positive replacements: ordinary money language

`naturalness-positive-check-account`: “You can be earning more and still check the account and see almost the same balance.”

`naturalness-positive-wonder-where`: “You can be making more money and still wonder where all of it went.”

### Negative: double hedging

`naturalness-negative-double-hedge`: “The first payment may fit. The problem may be that it keeps arriving after the excitement is over.”

### Positive replacement: supported consequence

`naturalness-positive-payment-keeps-showing`: “The first payment may fit. The problem is that the same payment keeps showing up long after the excitement is gone.”

### Negative: abstract proof language

`naturalness-negative-boundary-proven`: “A boundary is not proven because you wrote it down. It is proven when somebody asks for an exception and you can still keep it.”

### Positive replacement: observable test

`naturalness-positive-boundary-test`: “A boundary is easy to write down. The test comes when somebody asks for an exception and you still say no.”

### Do-not-flag control: compact rhetoric

`naturalness-do-not-flag-reply-silence`: “The reply you wanted can still create more work than the silence did.”

This control must never receive `unnatural_phrasing`, `owner_voice_drift`, or `density_violation`. It is immediately understandable, names a concrete consequence, and stops after the contrast lands.

### Pronoun context control

`naturalness-pronoun-context-positive`: “If it only works when nobody needs anything from you, it does not work often enough.”

This is acceptable when the preceding sentence names the schedule, routine, or plan. Do not flag `it` mechanically.

`naturalness-pronoun-standalone-positive`: “A schedule that only works when nobody needs anything from you does not work often enough.”

Use the standalone version only when no clear antecedent exists.

### Negative: formal verb and vague object

`naturalness-negative-interpret-finishing`: “Someone may interpret slower replies as disinterest because they cannot see what you are finishing.”

### Positive replacement: ordinary verb and concrete object

`naturalness-positive-read-work`: “Someone may read slower replies as disinterest because they cannot see the work you are trying to finish.”

## Finding discipline

Flag the smallest sentence range that creates the problem. Preserve a sentence that already lands. Never turn these diagnostics into a full-unit rewrite request, and never use them to override the specificity ceiling or possibility-language rules.
