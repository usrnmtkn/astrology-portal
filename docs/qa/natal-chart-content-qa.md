# Natal Chart Content QA

**Version:** `natal-chart-content-qa-v1`  
**Owner direction:** 2026-08-12  
**Surfaces:** You and Friend natal charts  
**Governance:** Review evidence only. No automatic copy change, approval, promotion, publication, or serving-state change.

## Purpose

This QA pass evaluates the complete reader experience for natal chart copy. It keeps factual correctness, sentence quality, whole-passage composition, voice parity, and visual presentation as separate checks so a good sentence cannot hide a broken paragraph and fluent prose cannot hide incorrect chart routing.

The whole-passage authority is [`TLDR-NATAL-CHART-WHOLE-PASSAGE-FLOW-JUDGE-OWNER.md`](../../tldr-astro-phrasebank/TLDR-NATAL-CHART-WHOLE-PASSAGE-FLOW-JUDGE-OWNER.md). The judge reads only the rendered passage and must state its core message before assigning a verdict.

## Required audit order

1. **Production correctness**
   - The passage is present on the intended You or Friend route.
   - Its placement, house, angle, aspect, or pattern facts match the fixed natal chart.
   - No current-sky or transit aspect is presented as natal.
   - Missing inputs and unapproved copy fail closed.
2. **Complete You/Friend comparison**
   - Every in-scope interpretation is rendered in both surfaces when both surfaces support it.
   - You uses natural second person.
   - Friend uses natural name/they language.
   - Both communicate equivalent astrology without requiring identical sentence structure.
3. **Sentence-level writing quality**
   - Each sentence passes literal first-read clarity, natural language, observable behavior, register, pronoun, repetition, banned-pattern, and translation-required checks.
4. **Whole-passage concept and flow review**
   - Read the rendered passage cold with no source rows, drafting context, or astrology explanation.
   - State one plain-language core message before judging.
   - Confirm that every sentence, example, transition, and ending develops that message.
   - Use only `PASS`, `EDIT`, `CUT`, or `SOURCE_GAP`.
5. **Visual review**
   - Check desktop and mobile rendering, headings, section order, whitespace, truncation, duplicate prose, labels, and You/Friend parity.
6. **Governed audit packet**
   - Record the rendered text and SHA-256, stable render key, route, family, source keys, paired You/Friend record, every stage verdict, problem lines, and revision instruction.
   - Preserve findings as owner-review evidence. Do not mutate serving content from the audit.

## In-scope passage families

- Big Three summaries
- planet-in-sign placements
- planet-in-house placements
- composed sign-plus-house placement passages
- Ascendant, Midheaven, and other supported named-point passages
- natal aspect interpretations and natal aspect groups
- natal aspect-pattern interpretations
- empty-house interpretations
- glossary or explanatory prose rendered inside the natal experience

Transit cards, current-sky copy, synastry, composite, and compatibility passages are out of scope except where the production-correctness check verifies that they did not leak into a natal section.

## Whole-passage hard failures

The whole-passage verdict cannot be `PASS` when any hard-failure code is present:

- `core_message_missing`
- `competing_core_messages`
- `central_subject_changed_without_bridge`
- `example_does_not_support_message`
- `conclusion_not_earned`
- `idea_level_repetition`
- `requires_astrology_context`
- `assembled_not_written`

The audit validator also rejects `PASS` when the core message is empty or contains more than one sentence.

## Required whole-passage output

Each passage record contains:

- `coreMessage`: one plain-language sentence
- `verdict`: `PASS`, `EDIT`, `CUT`, or `SOURCE_GAP`
- `flowDiagnosis`: a concise explanation of success or failure
- `problemLines`: only the rendered lines that materially interrupt comprehension
- `revisionInstruction`: what must change, without an unsolicited rewrite
- `hardFailureCodes`: zero or more enumerated hard failures
- `judgeInputMode`: exactly `rendered_text_only`

## Governance and operating limits

- The check is mandatory in a completed Natal Chart Content QA packet, but its prose verdict remains advisory and owner-gated.
- A model verdict cannot mark copy owner-approved, revoke an existing owner approval, rewrite protected copy, or authorize promotion.
- `EDIT`, `CUT`, and `SOURCE_GAP` create review findings. They do not change runtime state.
- No billed judge call is authorized by this protocol. A live/model audit requires separate explicit authorization for the call or batch.
- Approved copy remains byte-identical until the owner approves exact replacement wording.
- Every proposed replacement remains `needs_review`, with auto-publish off and writer promotion unauthorized.

## Validation

Run the contract check:

```sh
npm run qa:natal-content
```

Validate a completed packet:

```sh
node scripts/validate-natal-chart-content-qa.mjs --packet path/to/audit.json
```

The deterministic validator checks packet completeness, hashes, paired You/Friend coverage, verdict rules, hard failures, and non-promotion governance. It does not pretend to judge prose semantically.
