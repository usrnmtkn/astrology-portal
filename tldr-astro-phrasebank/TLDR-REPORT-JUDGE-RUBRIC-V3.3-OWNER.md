# Report fulfillment judge rubric v3.3

**Status:** `owner_approved`
**Version:** `report-judge-rubric-v3.3`
**Approved:** 2026-08-14
**Owner approved:** `true`
**Active in production:** `true`
**Promotion authorized:** `true`
**Approved source SHA-256:** `9f74b1ad1c4057286ca7acc6687b7ab8349e93d8b0e5de7f94c354ad83ea7f03`
**Baseline:** `report-judge-rubric-v3.2`
**Approved threshold:** `0.85` (unchanged)
**Amendment source:** `TLDR-REPORT-EARNED-SENTENCE-RULING-OWNER.md`, owner-approved 2026-08-14.
**Governance:** Owner-approved v3.3 successor layered over the active v3.2 judge and immutable v3.1 baseline. V3.3 and threshold 0.85 are active in production. Any later revision requires a new version and fresh owner approval.

> I approve the earned-sentence ruling at SHA e9a56a47…, critique checklist v6 at SHA 73a57573…, and judge rubric v3.3 at SHA 9f74b1ad…. Activate all three.

The complete v3.2 rubric, two-lens order, category scale, applicable-category formula, hard gates, attribution rule, and runtime verdict ownership remain unchanged. Replace only the owner-voice evaluation with the comparison-based rule below and add the earned-sentence evidence.

## Owner voice is comparative

Evaluate `owner_voice` by comparing the complete rendered unit with the supplied `OWNER_COMPARISON_SET`. The set contains two or three owner-authored final passages performing the same unit-level function: overview with overview, season with season, domain section with domain section, review with review, or closing with closing. Each passage carries an evidence ID and immutable provenance.

Style adjectives and rule compliance are not likeness evidence. A unit can be accurate, clear, direct, specific, status-neutral, and free of banned language while still reading nothing like the owner.

- Score 4 only when the unit is unmistakably continuous with the comparison passages while remaining natural to its own facts.
- Score 3 when the unit is recognizably continuous with the comparison passages, with only minor drift.
- Score 2 when the unit is compliant and clear but its sentence movement, pressure, judgment, or memorable specificity is materially unlike the comparison passages.
- Score 1 when the unit is generic report prose with little meaningful resemblance to the comparison passages.
- Score 0 when the unit contradicts the governed register or substitutes a different persona.

Every `owner_voice_drift` finding must cite one or more eligible comparison evidence IDs and explain the observable difference. Do not demand copied phrases, surface mimicry, or arbitrary objects. Do not use a comparison passage to rescue a missing referent or interpretation in the candidate.

## Earned-sentence evidence

A substantive prose unit with no sentence meeting the earned-sentence standard cannot score above 2 for `owner_voice`. The standard is not cleverness. The candidate must contain at least one immediately understandable sentence that holds two truths, names an unsaid consequence, says an ordinary thing exactly, or gives earned permission or judgment.

### Positive evidence: passes clarity and aliveness

- `earned-positive-two-truths`: “Each new opportunity can look manageable by itself. The Moon in the 6th shows the total daily cost once they are added together.”
- `earned-positive-ordinary-exact`: “It may be the same project, but it does not have to be.”
- `earned-positive-consequence-question`: “after the first week, is the new method saving time, or has maintaining it become extra work?”

### Labeled negative evidence: clear but unearned

- `earned-negative-safe-summary`: “The most useful changes are concrete.”
- `earned-negative-count-the-cost`: “The opportunity may still be worth taking, but the meetings, preparation, travel, revisions, and follow-up need to be counted before you agree.”
- `earned-negative-public-interest`: “Public interest may add deadlines and correspondence before the work itself is finished.”
- `earned-negative-end-of-period`: “By the end of the period, you have clearer evidence about which responsibilities to finish, which arrangements to revise, and which work is ready to share.”

The negative examples are factually acceptable. They fail only as evidence of owner likeness and aliveness.

## Output and verdict

The model continues to return scores and findings only, never verdicts or replacement prose. The runtime continues to recompute applicability, hard gates, overall, and verdict at threshold 0.85. `no_earned_sentence` is a critique-chain category; the judge represents the same failure through `owner_voice` score and an `owner_voice_drift` finding with comparison evidence.
