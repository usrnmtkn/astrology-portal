# Report fulfillment judge rubric v3.2

**Status:** `owner_approved`
**Version:** `report-judge-rubric-v3.2`
**Approved:** 2026-08-11
**Owner approved:** `true`
**Active in production:** `true`
**Promotion authorized:** `true`
**Approved source SHA-256:** `bce4534c7f0f6a5689afbf3305fac73ff8b2024669b5639e776fa77efd5a1e5f`
**Baseline:** `report-judge-rubric-v3.1`
**Approved threshold:** `0.85` (unchanged)
**Amendment source:** Cold Rendered Prose Rule, owner ruling 2026-08-11.
**Governance:** Owner-approved v3.2 amendment layered over the immutable v3.1 baseline. V3.2 and threshold 0.85 are active in production. Any later revision requires a new version and fresh owner approval.

> I explicitly approve Report judge rubric v3.2 at SHA-256 bce4534c7f0f6a5689afbf3305fac73ff8b2024669b5639e776fa77efd5a1e5f, Report critique checklist v5 at SHA-256 64f161623fb8f071056bb41b124626e502735a569cc880ba39e0c0932f15981f, and Multi-horizon report generation prompt v2 at SHA-256 358be6ddf05d9fe4e1c944878a8269809ec6e736ea53a6a014aefbb148bc77d7. I authorize activation in place of the current report judge, critique, and generation prompt. The judge threshold remains 0.85.

This draft preserves the v3.1 category scale, applicable-category overall formula, hard gates, output schema, comparison discipline, complete-unit calibration contract, and attribution-as-part-of-unit rule. It changes how the input is exposed and how prose categories are read.

## Two-lens evaluation

The runtime presents the unit to the judge through two separate lenses. Never use material from the factual lens to improve, translate, connect, or excuse prose in the cold lens.

### Lens 1: cold rendered prose

Judge these prose-quality categories using only `RENDERED_UNIT` exactly as a reader encounters it:

- `lived_experience`
- `owner_voice`
- `natural_language`
- `syntax_variety`
- `density`
- `emotional_temperature`
- `interpretive_movement`, only when the unit has at least two substantive prose paragraphs

For this lens, do not use `UNIT_FACTS`, the canonical prompt, source notes, astrology logic, intended meaning, drafting context, validator output, or attribution knowledge to make a sentence comprehensible. Owner comparison passages may establish the owner-voice standard, but they may not supply a missing referent, connection, circumstance, or meaning in the candidate.

Read line by line and as a paragraph. Every sentence must make sense on the first read, flow from the preceding sentence, lead naturally to the next sentence, use ordinary language, sound human, and state its intended meaning without asking the reader to decode it.

Route findings as follows:

- vague referents, sentences that sound assembled, report-heavy transitions, and unnecessarily formal vocabulary -> `natural_language` and/or `owner_voice_drift`, as supported
- repeated setup, repeated explanation, and a strong sentence followed by a paraphrase of the same landing -> `density_violation`
- abrupt jumps and disconnected sentences in a multi-paragraph unit -> `interpretive_gap`
- clever compression or an abstract summary that replaces an observable behavior, circumstance, decision, or consequence -> `unlived_abstraction` and/or `owner_voice_drift`, as supported

The prose lens does not create `cold_prose`, `flatness`, or `lived_prose` categories. Findings use only the governed categories and the smallest bounded scope.

### Lens 2: astrology and factual accuracy

After the cold read is complete, consult `UNIT_FACTS`, the attribution line, governed interpretations, manifestation records, and deterministic validator results only for:

- `astrology_chronology`
- `factual_traceability`

The v3.1 rules remain unchanged: the attribution line is part of the complete unit and may carry its technical astrology; prose need not repeat facts already stated there. Judge dates, chart layers, houses, aspects, pass sequences, claims, and specificity against the scoped frozen facts. Do not penalize a prose paragraph for astrology density the attribution already carries.

## Interpretive movement

Score `interpretive_movement` only when the bounded rendered unit contains at least two substantive prose paragraphs. Exclude headings, date ranges, attribution lines, labels, key-date bullets, colophon, and metadata. Otherwise return `null`, mark it `not_applicable`, explain why, exclude it from the overall calculation, and do not apply its hard gate.

## Category scale, hard gates, and verdict

Use the v3.1 zero-to-four scale. `astrology_chronology`, `factual_traceability`, `lived_experience`, `owner_voice`, and applicable `interpretive_movement` must each score at least 3. Compute:

```text
overall = sum(applicable category scores) / (4 * applicable category count)
```

The proposed threshold remains 0.85. The model returns scores and findings only. The runtime recomputes applicability, overall, hard gates, and verdict. The judge never writes or edits prose.

## Final instruction to the judge

Do not reward a sentence for being astrologically correct if it is awkward
prose. Correct astrology expressed in unnatural language still fails the
writing judge.

## Activation record

Activated as the production judge amendment over the immutable `TLDR-REPORT-JUDGE-RUBRIC-V3-OWNER.md` v3.1 baseline by the SHA-pinned owner authorization above.
