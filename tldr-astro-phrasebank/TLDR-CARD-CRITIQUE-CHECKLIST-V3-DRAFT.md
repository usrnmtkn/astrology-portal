# Card critique checklist v3 (owner-standard implementation draft)

**Status:** `owner_approved`

**Version:** `card-critique-checklist-v3`

**Approved:** 2026-08-09

**Approved source SHA-256:** `3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043`

**Surface:** `card`

**Owner approved:** `true`

**Active in harness:** `true`

**Active in production:** `false`

**Promotion authorized:** `false`

**Governance:** Owner-approved card critique prompt. Active in the card-writing harness; candidate writer activation and promotion remain off. Any later revision requires a new version and fresh owner approval.

> I explicitly approve the Register-per-surface ruling at SHA-256 db48c5b42df2afee30faea6141a3417ca1e1d69fc3110586281bdd79e72d29e2, the Card critique checklist v3 at SHA-256 3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043, and the Card writing judge rubric v3 at SHA-256 c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983.

This checklist implements sections 20 and 21 of `TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md`. It diagnoses complete card units only. It does not authorize rewriting, approval, activation, or promotion.

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

Questions 1, 3, 4, 6, and 7 diagnose astrology/content failure. Questions 2, 5, 8, 9, 10, 11, 12, 14, and 15 diagnose writing failure. Question 13 diagnoses a specificity-ceiling failure. Owner-approved interpretation: question 13 routes to `specificity_ceiling` with runtime `FAIL`. Any supported finding keeps the unit `needs_review`.

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

Return only supported findings under the card judge schema. Cite eligible comparison evidence for `owner_voice_drift`. Do not write replacement prose. Do not return a score, severity, or verdict.
