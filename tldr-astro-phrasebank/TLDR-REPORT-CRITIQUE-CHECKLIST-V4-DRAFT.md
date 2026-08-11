# Report critique checklist v4 draft

**Status:** `needs_review`
**Version:** `report-critique-checklist-v4-draft`
**Owner approved:** `false`
**Active in production:** `false`
**Promotion authorized:** `false`
**Baseline:** `report-critique-checklist-v3`
**Amendment source:** Owner review of Production report 74951c07, 2026-08-11.
**Governance:** Proposed replacement. V3 remains active. Approval of this draft would require an explicit version-pinned owner ruling; it does not change the judge rubric or threshold.

The critique call reviews one complete report unit. A complete unit includes its heading, date range when applicable, every prose paragraph, attribution line, and key-date block. The critic must use the unit-scoped facts bundle and two or three side-by-side owner-authored comparison passages supplied with the request.

The critic returns either `no_defects` or a JSON list of named defects. Each defect identifies a category, exact location, quote, governing evidence, and bounded correction instruction. It never writes replacement prose.

## First-read diagnostics: no cleverness tax

Run these four checks before the existing flatness questions:

1. Can the reader understand every sentence on the first read?
2. Did I name what actually happens instead of summarizing it with an abstract phrase?
3. Did I explain the cause before trying to make the sentence memorable?
4. If I removed the astrology, would this still sound like a useful description of a recognizable life situation?

These checks do not create a new defect category. Route supported findings to `unlived_abstraction`, `owner_voice_drift`, `interpretive_gap`, or `density_violation` according to the actual defect. Second person remains the report register. Judge abstract second person against recognizable second person; never recommend pronoun removal.

The labeled evidence packet includes `TLDR-REPORT-NO-CLEVERNESS-TAX-RULING-OWNER.md`. Treat every OWNER-REJECTED construction as negative evidence and every OWNER REPLACEMENT as owner-authored replacement evidence. The previously praised sentence "Wednesday still has one afternoon" is now rejected and must never count as positive comparison evidence.

Apply stop-after-the-landing: when a lived sentence already reveals the astrology, flag a following interpretive paraphrase as `density_violation` or `owner_voice_drift`, supported by the smallest bounded scope.

## Required input packet

1. `COMPLETE_UNIT` - the exact bounded unit that will be judged in production, including attribution and key dates.
2. `UNIT_FACTS` - the frozen facts scoped to this unit, including unit boundaries, dates, chart layers, aspects, pass sequence, and attribution facts.
3. `OWNER_COMPARISON_SET` - two or three owner-authored or explicitly owner-approved passages shown side by side, each with a stable evidence ID, provenance, and `function` in `opening`, `development`, `complication`, `turn`, or `close`. The candidate unit itself is forbidden from its own comparison set.
4. `LABELED_NEGATIVE_EXAMPLES` - calibration-only failures clearly excluded from positive voice evidence.
5. `VALIDATOR_RESULTS` - deterministic findings for the same complete unit.

Fail closed if the complete unit, scoped facts, or at least two eligible owner-comparison passages are absent. Never use an unapproved candidate, degraded fixture, rejected line, or judge output as positive voice evidence.

## Unit-level reading rules

- Read prose and attribution together. The attribution line is allowed to carry the technical astrology.
- Do not flag low astrology density when the attribution line accurately names the relevant factor and the prose traces to that factor through the scoped facts.
- Do not require every prose paragraph to restate a transit, date, house, pass, or chart layer.
- Compare voice directly against the supplied owner passages. A description of owner voice is guidance, not evidence.
- Concrete nouns in a list do not establish lived experience. The unit must show cause, choice, displacement, obligation, timing, or consequence.
- Ask whether the reader can see what changed because of what. `Capacity`, `cost`, `room`, `sustainability`, `energy`, `access`, `balance`, and `support` are not automatically defects, but they cannot carry a claim when the scoped facts support a more observable consequence.
- Treat a meaningful human contradiction as evidence of interpretive point of view: the reader may still want something while its old conditions no longer work. Do not require a contradiction in every paragraph.
- Astrology should explain the lived circumstance rather than interrupt it with a textbook definition. A transit-to-keyword-to-advice sequence may be an `interpretive_gap` when movement is applicable.
- In a multi-pass sequence, each pass must do a different narrative job. A later pass that merely regenerates the original manifestation menu may be `repeated_generated_syntax` or `interpretive_gap`.
- Advice should identify the next practical move inside the circumstance. Generic instructions to protect energy, honor needs, trust evidence, or create a sustainable routine do not repair an abstract passage.
- Writer-facing phrases such as `this report`, `this section`, `the point is`, `the question becomes`, `what matters here is`, `this transit gives you`, or `the second pass gives you` may be `owner_voice_drift` when they replace reader-facing circumstance. Apply this contextually, not as a mechanical phrase ban.
- Do not require a polished closer. A sentence that extracts a lesson after the observation already landed may be `density_violation` or `owner_voice_drift`.
- Preserve natural paragraphs. Several short sentences may belong inside one paragraph; isolated one-liners do not create interpretive movement by formatting alone.
- The generic-article diagnostic is corroborative only: it can never establish a defect by itself. Broadly relatable ordinary language is not drift when the unit context earns it. **Labeled do-not-flag example:** `The appointment is still at ten.`
- Evaluate interpretive movement only when the unit contains at least two substantive prose paragraphs. Exclude headings, date lines, attribution lines, labels, and key-date bullets from that count.
- When interpretive movement is not applicable, do not create an `interpretive_gap` merely because a short unit does not contain a multi-paragraph arc. Other defects may still apply.

## Defect categories

1. `astrology_chronology` - a date, sequence, pass number, chart layer, house, aspect, attribution, or report-window statement conflicts with `UNIT_FACTS`. Absence of repeated astrology in prose is not a defect when attribution carries it.
2. `factual_traceability` - a technical or lived claim cannot be traced to the complete unit's scoped facts, governed interpretation, or manifestation sets. Evaluate the complete unit rather than an isolated sentence.
3. `unlived_abstraction` - the unit names capacity, alignment, sustainability, balance, needs, conditions, or another concept where owner references show the recognizable circumstance. Identify the missing behavior, obligation, choice, timing, displacement, or consequence, including what changed because of what. Do not draft it.
4. `owner_voice_drift` - the unit is materially less consistent with the supplied owner comparison set in observation, consequence, movement, rhythm, authority, plainness, or emotional precision. Cite the comparison evidence IDs. Generic wellness, therapy, coaching, horoscope, explanatory-report, motivational, permission, aphoristic, or writer-facing language may qualify when the owner passages handle the same function concretely.
5. `interpretive_gap` - applicable only to a multi-paragraph unit. The unit contains astrology and conclusions but does not develop why one factor produces the lived result, how factors modify one another, or how the interpretation changes across the unit.
6. `unnatural_phrasing` - grammar or phrasing does not read as natural English in context.
7. `repeated_generated_syntax` - sentence architecture, rhetorical framing, or a manifestation menu repeats without a new interpretive function. A later transit pass that resets instead of advancing the story belongs here when the repetition is structural.
8. `emotional_temperature` - certainty, reassurance, alarm, diagnosis, sentiment, or emotional intensity exceeds the evidence.
9. `keyword_stack` - technical or abstract keywords appear without a lived translation. A transit-to-keyword sentence may also create `interpretive_gap` when movement is applicable.
10. `density_violation` - the unit repeats a menu, explains an example that already landed, manufactures a closer, exceeds a governed lexical budget, or continues after the stop rule is satisfied.

## Final flatness questions

Before returning `no_defects`, answer these against the complete unit and its owner comparison set:

1. Does the unit contain something a person could recognize happening?
2. Is the cause-and-consequence relationship visible?
3. Does it name the actual consequence rather than relying on an abstraction?
4. Does a major development passage contain a meaningful observation or contradiction, not only information?
5. Does astrology explain the circumstance rather than sit beside it?
6. Did writer-facing language leak into reader-facing prose?
7. Does any sentence explain an example that already made the point?
8. Does the unit force an inspirational or aphoristic closer after it was already finished?
9. Could the interpretive passage move unchanged into a generic wellness, HR, or horoscope article because it lacks the unit-specific circumstance, cause, or consequence? If so, identify what is missing. This diagnostic alone cannot establish a defect.
10. Would removing the final sentence make the unit stronger because it only restates the lesson? If so, name the bounded density defect.

These questions do NOT create a new defect category. Do not return `flatness`
or `lived_prose` as a category. Their findings route into the existing defect
categories:

questions 1–3  -> unlived_abstraction
questions 4–5  -> interpretive_gap and/or owner_voice_drift as supported
question 6     -> owner_voice_drift
question 7     -> density_violation
question 8     -> owner_voice_drift and/or density_violation
question 9     -> unlived_abstraction or owner_voice_drift, with comparison evidence
question 10    -> density_violation

These are diagnostic questions, not instructions to invent manifestations. Findings must remain inside `UNIT_FACTS`, governed interpretation, and the supplied comparison evidence.

## Comparison discipline

An `owner_voice_drift` defect must answer all three questions:

1. Which supplied owner comparison passage performs the same function?
2. What observable difference appears in the candidate: circumstance, consequence, movement, rhythm, or authority?
3. Why is that difference material rather than a preference for another elegant phrasing?

Do not flag stylistic variation alone. Do not treat grammatical clarity, concrete nouns, or a passing aggregate score as proof of owner-voice fidelity.

Compare passages performing the same tagged function. Treat `function` as supplied evidence, not something the critic infers from wording.

> When several categories describe the same underlying defect and require the same correction, return the narrowest causal defect as primary. Add a second defect only when it identifies a materially different problem requiring a separate correction.

## Output contract

Return JSON only:

```json
{
  "result": "no_defects",
  "applicability": {
    "interpretive_movement": "applicable",
    "reason": "The unit contains multiple substantive prose paragraphs."
  },
  "defects": []
}
```

or:

```json
{
  "result": "defects",
  "applicability": {
    "interpretive_movement": "not_applicable",
    "reason": "The bounded unit contains one substantive prose paragraph."
  },
  "defects": [
    {
      "id": "defect-1",
      "category": "owner_voice_drift",
      "location": "body paragraph 1",
      "sentence_index": 1,
      "scope_start": 1,
      "scope_end": 1,
      "quote": "FIXTURE_ONLY_SENTENCE",
      "evidence": "FIXTURE_ONLY_BOUNDED_EVIDENCE",
      "evidence_ids": ["owner-comparison-1"],
      "instruction": "FIXTURE_ONLY_BOUNDED_CORRECTION_INSTRUCTION"
    }
  ]
}
```

`sentence_index` identifies a representative sentence. `scope_start` and `scope_end` are inclusive sentence indices within `location` and define the full authorized correction range. A single-sentence defect sets all three indices to the same value. A paragraph-level or multi-paragraph `interpretive_gap` or `repeated_generated_syntax` defect may name a wider range, but the range must be the smallest scope that can repair the diagnosed problem. The revise call may change only text inside explicitly named ranges and remains forbidden from changing anything outside every named scope.

Do not name a defect without specific unit or comparison evidence. Do not suggest stylistic variation. Do not rewrite prose.

## Finding-level calibration

The single-sentence Work & Money closer mutation tests detection sensitivity without forcing an unjustified whole-unit score. The critic must return a bounded `owner_voice_drift` finding naming that sentence. This fixture has no whole-unit score contract and is not positive voice evidence.

## Activation record

V3 replaces v2 in the production prompt selector. Activation is authorized because:

1. the v3 rubric and critique checklist were owner-approved;
2. runtime schemas support applicability and comparison evidence;
3. complete-unit paired fixtures passed deterministic fact and structure checks;
4. calibration run two completed exactly eight judge calls and one critique call with no retries, and every configured contract passed; and
5. the owner approved threshold 0.85 and authorized v3 activation on 2026-08-09.

