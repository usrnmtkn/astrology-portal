# Report fulfillment judge rubric v3.4

**Status:** `owner_approved`
**Version:** `report-judge-rubric-v3.4`
**Approved:** 2026-08-14
**Owner approved:** `true`
**Active in production:** `true`
**Promotion authorized:** `true`
**Approved source SHA-256:** `bfaca50bb8c4d156d9181b6134debb7ef21002685b690b6286f1ff43a0e78508`
**Baseline:** `report-judge-rubric-v3.3`
**Approved threshold:** `0.85` (unchanged)
**Amendment source:** `TLDR-REPORT-NATURALNESS-RULING-OWNER.md`, owner-approved 2026-08-14.
**Governance:** Owner-approved v3.4 successor layered over the active v3.3 judge rubric and its earlier governed layers. V3.4 and threshold 0.85 are active in production. Any later revision requires a new version and fresh owner approval.

> I explicitly approve the Report Naturalness and Judging-Restraint ruling at SHA-256 d14433fb6bdee571a36460792f6527b98d3ad94072a178dfdb3d876aed8476db, Report critique checklist v7 at SHA-256 e339c3a6a1bfce28032113994767b893e783cf219653fbd7ecabde20d1e0cb86, and Report judge rubric v3.4 at SHA-256 bfaca50bb8c4d156d9181b6134debb7ef21002685b690b6286f1ff43a0e78508. I authorize their activation; the judge threshold remains 0.85. This approval does not authorize generation calls.

The complete v3.3 rubric, comparison-based owner-voice rule, two-lens order, category scale, applicable-category formula, hard gates, attribution rule, and runtime verdict ownership remain unchanged. Add the naturalness-and-restraint rules below.

## Governing naturalness rule

> Do not flag a sentence because it is stylish. Flag it when the style makes the reader work harder than the meaning requires.

Judge naturalness, consequence, and clarity together. Do not treat the absence of banned words as sufficient evidence of natural language, and do not treat compact rhetoric as a defect merely because it is memorable.

## Scoring natural language and owner voice

Lower `natural_language` when constructed phrasing, double hedging, abstract proof language, or consequential vagueness makes the reader work harder than the supported meaning requires.

Lower `owner_voice` only when comparison with the supplied same-function owner passages shows observable drift in ordinary verbs, consequence, judgment, or sentence movement. Every `owner_voice` finding still requires eligible comparison evidence.

Do not lower either score for:

- concise rhetoric, contrast, or metaphor that lands immediately;
- a pronoun with an obvious antecedent in the complete paragraph;
- a sentence already at maximum useful specificity;
- a strong sentence that stops after it lands.

Pronoun judgment is contextual and never mechanical.

## Labeled comparison evidence

The following rejected/owner pairs from generation 2 are governed evidence.

- `naturalness-negative-open-statement`: “You can be earning more and still open the statement to nearly the same balance.”
- `naturalness-positive-check-account`: “You can be earning more and still check the account and see almost the same balance.”
- `naturalness-positive-wonder-where`: “You can be making more money and still wonder where all of it went.”
- `naturalness-negative-double-hedge`: “The first payment may fit. The problem may be that it keeps arriving after the excitement is over.”
- `naturalness-positive-payment-keeps-showing`: “The first payment may fit. The problem is that the same payment keeps showing up long after the excitement is gone.”
- `naturalness-negative-boundary-proven`: “A boundary is not proven because you wrote it down. It is proven when somebody asks for an exception and you can still keep it.”
- `naturalness-positive-boundary-test`: “A boundary is easy to write down. The test comes when somebody asks for an exception and you still say no.”
- `naturalness-negative-interpret-finishing`: “Someone may interpret slower replies as disinterest because they cannot see what you are finishing.”
- `naturalness-positive-read-work`: “Someone may read slower replies as disinterest because they cannot see the work you are trying to finish.”

## Do-not-flag controls

`naturalness-do-not-flag-reply-silence`: “The reply you wanted can still create more work than the silence did.”

This sentence must never be penalized for `natural_language`, `owner_voice`, or `density`. It is surprising but immediately understandable, and its contrast names a concrete consequence.

`naturalness-pronoun-context-positive`: “If it only works when nobody needs anything from you, it does not work often enough.”

This sentence is acceptable when the preceding sentence names the schedule, routine, or plan. Demand the standalone noun only when the antecedent is genuinely unclear.

## Output and verdict

The model continues to return scores and findings only, never verdicts or replacement prose. The runtime continues to recompute applicability, hard gates, overall, and verdict at threshold 0.85. This amendment creates no new judge category and changes no threshold.
