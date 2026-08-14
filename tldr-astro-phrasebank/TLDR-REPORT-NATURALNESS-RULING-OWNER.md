# Naturalness and judging-restraint ruling (owner ruling, canonical)

**Status:** `owner_approved`
**Version:** `report-naturalness-ruling-v1`
**Approved:** 2026-08-14
**Owner approved:** `true`
**Active in production:** `true`
**Promotion authorized:** `true`
**Approved source SHA-256:** `d14433fb6bdee571a36460792f6527b98d3ad94072a178dfdb3d876aed8476db`
**Register:** REPORT
**Companions:** `TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md` sets the clarity floor; `TLDR-REPORT-EARNED-SENTENCE-RULING-OWNER.md` sets the aliveness floor. This ruling governs naturalness and judging restraint. None overrides another.
**Origin:** The owner's line edits on generation 2 of report `e7da0406`. All six before/after pairs below are owner-authored corrections of generated prose the judge passed; they are labeled corpus evidence for the critique checklist and judge rubric.
**Governance:** Owner-approved and active in the report draft, critique, revision, and judge packets. Any later revision requires a new version and fresh owner approval.

> I explicitly approve the Report Naturalness and Judging-Restraint ruling at SHA-256 d14433fb6bdee571a36460792f6527b98d3ad94072a178dfdb3d876aed8476db, Report critique checklist v7 at SHA-256 e339c3a6a1bfce28032113994767b893e783cf219653fbd7ecabde20d1e0cb86, and Report judge rubric v3.4 at SHA-256 bfaca50bb8c4d156d9181b6134debb7ef21002685b690b6286f1ff43a0e78508. I authorize their activation; the judge threshold remains 0.85. This approval does not authorize generation calls.

## The governing rule

```text
Do not flag a sentence because it is stylish. Flag it when the style makes the
reader work harder than the meaning requires.

The judge should be learning naturalness + consequence + clarity, not just
hunting for banned words.
```

## What to flag

- **Constructed phrasing.** A normal person would understand the idea but probably would not say it that way. Prefer the ordinary verb attached to the actual object or behavior.
- **Double hedging.** Soft certainty is useful, but repeated hedging flattens a strong observation. If the first clause already carries uncertainty, the consequence does not always need to hedge again.
- **Abstract proof language.** When a sentence has a strong idea, prefer the observable test over abstract language about proving, demonstrating, embodying, or maintaining something. Repeated rhetorical structure makes a sentence feel manufactured.
- **Vagueness that matters.** Replace a vague object with the actual work, task, cost, schedule, or responsibility when that specificity is supported. Flag only when the missing noun or action matters to comprehension.

## What NOT to flag

- **Concise rhetoric, contrast, or metaphor that lands immediately.** Do not flag a sentence merely because it is compact, rhetorical, or slightly unexpected. If the reader understands it at once and the contrast sharpens the consequence, it is doing useful work.
- **Pronouns with obvious antecedents.** Do not rewrite pronouns mechanically. Flag them only when the referent is actually unclear in context. A concise pronoun can improve rhythm when the antecedent is obvious.
- **Sentences that already reached maximum useful specificity.** Do not force every sentence into more detail when context makes the referent plain.
- **Strong lines, once they land.** Preserve them. Do not explain them afterward.

## Owner before/after evidence (generation 2 line edits)

**1. Unnatural verb for an ordinary action.**
REJECTED: "You can be earning more and still open the statement to nearly the same balance."
OWNER: "You can be earning more and still check the account and see almost the same balance."
SHARPER OWNER ALTERNATIVE: "You can be making more money and still wonder where all of it went."
*The sentence describes a very ordinary money experience, so the language should sound ordinary too.*

**2. Double hedging weakens a supported consequence.**
REJECTED: "The first payment may fit. The problem may be that it keeps arriving after the excitement is over."
OWNER: "The first payment may fit. The problem is that the same payment keeps showing up long after the excitement is gone."

**3. Abstract proof language instead of the observable test.**
REJECTED: "A boundary is not proven because you wrote it down. It is proven when somebody asks for an exception and you can still keep it."
OWNER: "A boundary is easy to write down. The test comes when somebody asks for an exception and you still say no."
*"Proven" twice is formal and rhetorical; "keep it" is vague. What the person actually does is say no.*

**4. KEEP EXACTLY — do-not-flag control.**
"The reply you wanted can still create more work than the silence did."
*Surprising but immediately understandable. Names a concrete consequence. The contrast between reply and silence does real work. No filler, explanation, or moral after the point lands. This is the model for compact rhetoric that must never be flagged.*

**5. Pronoun: conditional, not mechanical.**
ACCEPTABLE IN CONTEXT (when the preceding sentence names the schedule, routine, or plan): "If it only works when nobody needs anything from you, it does not work often enough."
OWNER STANDALONE VERSION: "A schedule that only works when nobody needs anything from you does not work often enough."
*Owner preference: the first, because it is less clever and more useful.*

**6. Ordinary verb, concrete object.**
REJECTED: "Someone may interpret slower replies as disinterest because they cannot see what you are finishing."
OWNER: "Someone may read slower replies as disinterest because they cannot see the work you are trying to finish."
*"Read" is more natural than "interpret"; "the work you are trying to finish" is concrete without introducing another idiom.*

## Owner's strongest three from this pass (positive evidence)

```text
The reply you wanted can still create more work than the silence did.

A boundary is easy to write down. The test comes when somebody asks for an
exception and you still say no.

The first payment may fit. The problem is that the same payment keeps showing
up long after the excitement is gone.
```
