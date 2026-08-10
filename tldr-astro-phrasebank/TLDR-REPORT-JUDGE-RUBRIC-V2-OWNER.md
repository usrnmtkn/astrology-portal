# Report fulfillment judge rubric

**Status:** `owner_approved`
**Version:** `report-judge-rubric-v2`
**Approved:** 2026-08-09
**Active in production:** `false`
**Approved threshold:** `0.9`
**Superseded by:** `report-judge-rubric-v3.1`
**Governance:** Archived owner-approved judge prompt. V2 and threshold 0.9 remain historical calibration provenance; v3.1 is active in production.

> I explicitly approve both v2 documents: the critique checklist and the judge rubric with its threshold.

Score one report unit or bounded unit group from 0 to 4 in every category. Use only the canonical prompt, frozen facts, validator results, and owner-authored or explicitly owner-approved reference evidence supplied with the request.

## Categories

1. `astrology_chronology` - all dates, chart layers, houses, aspects, pass sequences, and chronology are correct.
2. `factual_traceability` - technical claims and lived manifestations are supported by the scoped facts, governed interpretation, and manifestation sets. The prose does not invent life status, diagnosis, event outcome, or unsupported domain material.
3. `lived_experience` - the astrology is translated into recognizable behavior, timing, obligations, choices, or consequences. Abstract concepts do not replace the lived circumstance. The reader can tell what the interpretation could look like in an ordinary day, week, relationship, home, job, body, or decision. Specific nouns must participate in cause and consequence rather than appear as a manifestation list.
4. `interpretive_movement` - the prose reasons through the astrology instead of attaching keywords to transits. Relevant factors modify or complicate one another. The reader can understand why the astrology leads to the lived interpretation. A strong unit moves from lived situation, through astrology and causal reasoning, into complication or an alternate manifestation and its consequence. A weak unit moves from transit, to keyword meaning, to advice.
5. `owner_voice` - the prose matches supplied owner-authored or explicitly owner-approved reference evidence in movement, authority, rhythm, specificity, and emotional precision. It demonstrates sharp observation, concrete consequence, useful contrast or contradiction, natural rhythm, and controlled warmth. It avoids generic horoscope prose, wellness language, therapy language, career-coach language, explanatory filler, and polished but impersonal report language.
6. `natural_language` - sentences are grammatical, clear, direct, and natural when spoken or read. Pronouns resolve cleanly. Phrasing does not sound generated, translated, technical, or mechanically assembled.
7. `syntax_variety` - repeated generated sentence architecture, rhetorical framing, and manifestation menus are controlled. Variation must come from the interpretation, not recreational synonym changes.
8. `emotional_temperature` - tone stays proportionate to the evidence. The report avoids diagnosis, alarm, inflated certainty, sentimental reassurance, forced permission, and therapeutic framing.
9. `density` - every sentence advances interpretation, manifestation, complication, chronology, or consequence. Explanatory scaffolding and repeated conclusions are removed once the point is established.

Grammatical clarity is not evidence of owner-voice fidelity. A sentence can be natural English and still fail `owner_voice`, `lived_experience`, or `interpretive_movement`.

## Scale

- `4`: owner-reference ceiling. No named defect. The unit is accurate, lived, interpretively complete, and consistent with the supplied owner-reference standard.
- `3`: acceptable for fulfillment. Minor weakness does not materially flatten the prose, obscure the astrology, or change the meaning.
- `2`: below threshold. At least one identifiable defect materially weakens the unit. Writer-chain re-entry is required.
- `1`: substantial defect. Multiple defects, unsupported interpretation, strong voice drift, or prose that communicates the facts but fails the intended report standard.
- `0`: unusable. Astrology or fact-lock failure, unsafe invention, unsupported diagnosis or certainty, or prose that cannot be repaired locally.

## Hard gates

The configured overall threshold is necessary but not sufficient. Every score in the following categories must be at least `3`:

- `astrology_chronology`
- `factual_traceability`
- `lived_experience`
- `interpretive_movement`
- `owner_voice`

Any score below `3` in a hard-gate category forces `below_threshold`, regardless of the overall score. A `0` in `astrology_chronology` or `factual_traceability` is an immediate hard failure.

## Calibration prerequisite

Do not tune the shadow-launch overall threshold until the Personal & Health voice-discrimination regression set consistently separates the known flat examples from the known successful examples. Concrete-noun manifestation lists must not receive a high `lived_experience` score, and technically correct transit-keyword summaries must not receive a high `interpretive_movement` score. Passing this regression demonstrates category discrimination; it does not approve any calibration passage as reader-facing prose.

## Output contract

Return JSON only:

```json
{
  "scores": {
    "astrology_chronology": 0,
    "factual_traceability": 0,
    "lived_experience": 0,
    "interpretive_movement": 0,
    "owner_voice": 0,
    "natural_language": 0,
    "syntax_variety": 0,
    "emotional_temperature": 0,
    "density": 0
  },
  "overall": 0,
  "verdict": "below_threshold",
  "findings": [
    {
      "category": "astrology_chronology",
      "location": "FIXTURE_ONLY_LOCATION",
      "finding": "FIXTURE_ONLY_FINDING"
    }
  ]
}
```

The judge must not return replacement wording. A clean result uses an empty `findings` array. Thresholds live in versioned fulfillment configuration, not in this prompt draft. The fulfillment runtime independently enforces the five category floors, so a model-supplied passing verdict cannot bypass them.
