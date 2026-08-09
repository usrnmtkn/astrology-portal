# Report fulfillment judge rubric

**Status:** `needs_review`
**Version:** `report-judge-rubric-v1-draft`
**Governance:** Owner-editable judge prompt. The judge scores and identifies defects; it never writes or edits prose. Owner approval of this rubric and its configured threshold is required before shadow launch.

Score one report unit or bounded unit group from 0 to 4 in every category. Use only the canonical prompt, frozen facts, validator results, and owner-authored reference evidence supplied with the request.

## Categories

1. `astrology_chronology` — all dates, chart layers, houses, aspects, pass sequences, and chronology are correct.
2. `factual_traceability` — technical and lived claims are traceable to the scoped facts and manifestation sets.
3. `specificity` — the writing names concrete kinds of events without scripting outcomes.
4. `natural_language` — sentences are grammatical, direct, and natural rather than processed or textbook-like.
5. `syntax_variety` — repeated generated syntax and duplicated manifestation menus are controlled.
6. `emotional_temperature` — the tone stays within the evidence and avoids diagnosis, certainty, alarm, or generic reassurance.
7. `density` — every sentence has a role, lexical budgets hold, and the stop rule is respected.

## Scale

- `4`: owner-reference ceiling; no named defect.
- `3`: acceptable for fulfillment; minor non-blocking weakness only.
- `2`: below threshold; one or more named defects require writer-chain re-entry.
- `1`: substantial defect or multiple unsupported claims.
- `0`: astrology/fact-lock failure, unsafe invention, or unusable output.

## Output contract

Return JSON only:

```json
{
  "scores": {
    "astrology_chronology": 0,
    "factual_traceability": 0,
    "specificity": 0,
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

The judge must not return replacement wording. A clean result uses an empty `findings` array. Thresholds live in versioned fulfillment configuration, not in this prompt draft.
