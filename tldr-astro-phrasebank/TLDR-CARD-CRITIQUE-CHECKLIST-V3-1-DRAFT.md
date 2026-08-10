# Card critique checklist v3.1 (draft)

**Status:** `needs_review`

**Version:** `card-critique-checklist-v3.1-draft`

**Drafted:** 2026-08-09

**Surface:** `card`

**Owner approved:** `false`

**Active in harness:** `false`

**Active in production:** `false`

**Promotion authorized:** `false`

**Fixture-set status:** `finalized_for_owner_review`

**Governance:** Successor draft to the owner-approved card critique checklist v3. The approved v3 document remains active in the harness and unchanged. This v3.1 draft is inactive, cannot authorize model calls, and requires fresh owner approval. The owner ruled the v3 findings on `gold-lilith-sagittarius-v5` and `gold-lilith-pisces-v5` judge errors on 2026-08-09.

This checklist implements sections 20 and 21 of `TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md`. It diagnoses complete card units only. It does not authorize rewriting, approval, activation, promotion, or a live evaluation.

## Fifteen-question editorial test

For every complete card, ask:

1. What is actually happening?
2. Can the first sentence be recognized without knowing astrology?
3. Is there a real person, object, decision, schedule, amount, request, deadline, or consequence?
4. Does the copy show cause and consequence, not merely a domain?
5. Is there a useful contradiction?
6. Is the planet still doing its own job?
7. Is the aspect materially changing how that planetary job behaves?
8. Could this exact paragraph be pasted under five other transits? If yes, it is too generic.
9. Did the writer explain a good sentence after it already landed?
10. Did the card end with generic wisdom?
11. Is any sentence written for the astrologer rather than the reader?
12. Did the writer use a keyword list where one lived scene would be stronger?
13. Did the card invent a life status or event the chart did not earn?
14. Does the advice emerge from the actual circumstance?
15. Does the copy have enough personality that someone might remember one sentence from it?

Questions 1, 3, 4, 6, and 7 diagnose astrology/content failure. Questions 2, 5, 8, 9, 10, 11, 12, 14, and 15 diagnose writing failure. Question 13 diagnoses a specificity-ceiling failure. The owner-approved v3 interpretation remains unchanged: question 13 routes to `specificity_ceiling` with runtime `FAIL`. Any supported finding keeps the unit `needs_review`.

## Finding routing

The checklist creates no new model verdict. Findings route into the card judge's governed categories and runtime actions:

| Questions | Governed finding category or categories |
| --- | --- |
| 1, 6, 7 | `astrology_integrity` |
| 3, 4, 8, 12 | `example_proves_astrology`, `tagline_stands_alone`, and/or evidence-backed `owner_voice_drift` |
| 2 | `metaphor_requires_translation` when ordinary meaning requires translation |
| 5, 9, 10, 11, 14, 15 | Evidence-backed `owner_voice_drift`, `stock_trope`, or `tagline_stands_alone` according to the observable defect |
| 13 | `specificity_ceiling` |

Shared deterministic bans route to `shared_ban`. Sign-only domain substitution routes to `house_bleed`. The model returns findings only; runtime code computes PASS, REVISE, or FAIL.

## Collision and tier-boundary discipline

> When several categories describe the same underlying defect and require the same correction, return the narrowest causal defect as primary. Add a second defect only when it identifies a materially different problem requiring a separate correction.

> Before returning a secondary defect, state internally what separate edit would be required to fix it. If the same edit fixes both labels, suppress the secondary label.

If deleting a career-domain substitution fixes both alleged `house_bleed` and `owner_voice_drift`, only `house_bleed` survives. If a card has house bleed and separately ends in a generic self-help coaching line, those require two different edits, so both findings may survive.

FAIL-tier categories require independent evidence and are never filing locations for register or craft defects:

- `house_bleed` is the narrowest category whenever the defect is domain-substitution for a sign mechanism. A career-domain substitution is `house_bleed`, not `specificity_ceiling` — discussing a domain is not asserting a life status as fact.
- `specificity_ceiling` fires only when the card states an unsupported event, motive, status, or outcome AS FACT about the reader. Domain vocabulary, implication, or register drift never qualifies.
- `shared_ban` fires only on the enumerated banned strings and inventions, not on therapy-adjacent tone (that is `stock_trope` or evidence-backed `owner_voice_drift`).
- `astrology_integrity` requires an independent contradiction of the supplied astrology facts or astrological function.

## Owner-standard comparison controls

Use these examples as diagnostic controls, not as freestanding style adjectives. Voice judgment still requires comparison with two or three eligible same-surface owner cards.

| Failure mode | Reject | Prefer / do not flag |
| --- | --- | --- |
| Aspect definition before life | “Jupiter expands the public role, creating opportunities for increased visibility and recognition.” | “More people are paying attention now.” followed by the lived circumstance and then the astrology |
| Conceptual consequence | “This may challenge your capacity.” | “The late meeting takes the only evening you had free.” |
| Generic coaching | “Remember to maintain balance and protect your energy.” | Advice earned by the actual terms, money, authority, time, or deadline in the scene |
| Keyword stack | “Work, money, clients, recognition, publishing, leadership, titles, reputation, and public opportunities may expand.” | “A proposal gets accepted. Someone recommends you before you ask.” |
| Explanation after the line lands | Explaining that three easy yeses create scheduling challenges | “Three easy yeses can create one impossible week.” and stop |
| Manufactured wisdom | “Ultimately, growth is about learning how to expand without losing yourself.” | End where the specific consequence becomes clear |
| Flat doctrine | “Growth creates friction with the current structure.” | “The opportunity is getting bigger. The agreement around it is not.” |

## Direct owner corrections preserved as critique instructions

- “These phrases have drifted.” Compare against approved voice and lived prose, not the previous generated draft.
- “This is more of the style.” Require personality, rhythm, permission, and point of view after the observation is clear.
- “I need the entire write-up.” Do not pass an isolated row while the family remains inconsistent.
- “Please keep writing this until it's approved.” `needs_review` is not completion.
- “This is factual, but still flat.” Accuracy without observation, consequence, contradiction, cadence, or a recognizable human moment is insufficient.
- “You just changed the position of the sentences and then flattened the sentences.” Revision must improve the thought and preserve vivid material.
- “This doesn't make sense when I read it.” Judge the sentence as ordinary English, not as astrology logic.

## Output discipline

Return only supported findings under the card judge schema. Cite eligible comparison evidence for `owner_voice_drift`. Every theme, concreteness, house-bleed, specificity, or drift finding must cite at least one exact element ID from the supplied `MECHANISM_RECORD`; a finding without a valid mechanism citation is invalid. The judge is forbidden from using astrology knowledge outside the supplied facts and mechanism record. Apply the collision rule before returning the findings. Do not write replacement prose. Do not return a score, severity, or verdict.
