# Card writing judge rubric v3 (comparison-based draft)

**Status:** `owner_approved`

**Version:** `card-writing-judge-rubric-v3`

**Approved:** 2026-08-09

**Approved source SHA-256:** `c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983`

**Surface:** `card`

**Owner approved:** `true`

**Active in harness:** `true`

**Active in production:** `false`

**Promotion authorized:** `false`

**Governance:** Owner-approved card judge prompt. Active in the card-writing harness; candidate writer activation and promotion remain off. Any later revision requires a new version and fresh owner approval.

> I explicitly approve the Register-per-surface ruling at SHA-256 db48c5b42df2afee30faea6141a3417ca1e1d69fc3110586281bdd79e72d29e2, the Card critique checklist v3 at SHA-256 3507f41f6c29b6b9abb2216e9f2acddf63be519866b4c88259c852791cbad043, and the Card writing judge rubric v3 at SHA-256 c7426929d5868847bea263b3c8b7eb3830304657dde2f6f54ebb7b417268e983.

This rubric was rebuilt after the writing-harness-v2 live evaluation and is owner-approved for the card-writing harness. It never authorizes writer promotion.

## Fail-closed input packet

Reject the evaluation before judging unless the packet supplies all of the following:

1. `SURFACE` equal to `card`.
2. `COMPLETE_CARD` with the complete candidate and supplied location/index tokens.
3. `ASTROLOGY_FACTS` and the structured meaning plan.
4. `OWNER_COMPARISON_SET` containing two or three complete owner-authored, owner-locked cards from the card surface that perform comparable functions.
5. A unique evidence ID and provenance record for every comparison card.
6. `TARGET_FUNCTIONS` describing the functions being compared.
7. `LABELED_NEGATIVE_EXAMPLES`, explicitly excluded from positive voice evidence.
8. `VALIDATOR_RESULTS` from the deterministic card validators.
9. `LOCATION_CONTRACT` supplied as data.

The candidate itself is forbidden from its own comparison set, both by evidence ID and by exact card content. Report evidence is forbidden. A packet with either form of cross-application is invalid and receives no semantic result.

## Judging method

Judge observable drift from the supplied comparison cards. Do not grade against a list of style adjectives. Voice findings must cite one or more eligible comparison evidence IDs and explain the observable difference.

Hooks, wit, cadence, permission language, short paragraphs, direct address, and point of view belong to the CARD register. Their presence is not a defect. A hook becomes defective only when the complete card does not develop a consequence beneath it.

Deterministic validator findings are evidence, not a model verdict. Return findings only. Do not return `PASS`, `REVISE`, `FAIL`, severity, a score, or replacement prose. Runtime code owns the verdict.

## Card-scoped categories

| Category | Definition | Runtime action |
| --- | --- | --- |
| `astrology_integrity` | The card contradicts the supplied astrology facts or assigns a function the supplied body, point, sign, aspect, or house does not have. | `FAIL` |
| `shared_ban` | The card violates a shared register ban: em dash; "whether"; banned wellness/therapy language; soulmate/twin-flame/"your person" language; astrologer persona; invented symptom, diagnosis, crisis, or outcome. | `FAIL` |
| `specificity_ceiling` | The card asserts an unsupported event, motive, life status, or outcome as fact. | `FAIL` |
| `house_bleed` | A sign-only card is defined through its traditionally associated house domain rather than the supplied sign mechanism. One earned example is not enough; the domain must replace the mechanism. | `REVISE` |
| `stock_trope` | A familiar domestic, dating, therapy, workplace, or self-help shortcut stands in for the card's actual mechanism. Card wit and permission language are not stock tropes by themselves. | `REVISE` |
| `example_proves_astrology` | A concrete-looking example could illustrate almost any card and does not demonstrate the supplied mechanism. | `REVISE` |
| `metaphor_requires_translation` | The reader must translate figurative compression back into ordinary events before understanding what happened. Immediately understandable sharp language is allowed. | `REVISE` |
| `tagline_stands_alone` | The opening hook or tagline has no developed cause, stake, behavior, or consequence beneath it in the complete card. The presence of a hook, or a hook that is not independently explanatory, is not a defect. | `REVISE` |
| `owner_voice_drift` | Compared with the supplied same-surface exemplars, the card observably loses the owner's card register through generic filler, category-list abstraction, or unearned tonal imitation. This category requires eligible comparison evidence IDs. | `REVISE` |

Categories from v2 that merely penalized card voice are removed or folded into these definitions. `generic_self_help`, `clinical_shorthand`, and `advocacy_register_drift` route to `shared_ban`, `stock_trope`, or evidence-backed `owner_voice_drift` according to the actual defect. `observable_behavior` routes to `example_proves_astrology` or `tagline_stands_alone`. `literal_first_read_clarity` routes to `metaphor_requires_translation`. `redundancy` is not a standalone card defect.

## Run-one false positives: labeled do-not-flag controls

The following exact owner-locked cards are negative controls for over-flagging. They are not automatically inserted into a candidate's positive comparison set. When supplied as the candidate, do not reproduce the v2 false positives listed here:

| Evidence ID | V2 false-positive categories that must not recur |
| --- | --- |
| `gold-lilith-aries-v5` | `tagline_stands_alone` |
| `gold-lilith-taurus-v5` | `literal_first_read_clarity`, `metaphor_requires_translation`, `generic_self_help` |
| `gold-lilith-gemini-v5` | `redundancy` |
| `gold-lilith-leo-v5` | `literal_first_read_clarity`, `metaphor_requires_translation`, `invented_motive`, `advocacy_register_drift`, `redundancy` |
| `gold-lilith-virgo-v5` | `literal_first_read_clarity`, `metaphor_requires_translation`, `invented_motive` |
| `gold-lilith-capricorn-v5` | `sign_house_separation`, `stock_trope`, `tagline_stands_alone`, `redundancy` |
| `gold-lilith-aquarius-v5` | `sign_house_separation`, `generic_self_help` |

These controls do not excuse real defects in another candidate. They establish that card-register traits cannot be penalized merely for sounding like cards.

## Output contract

Return strict JSON:

```json
{
  "findings": [
    {
      "category": "owner_voice_drift",
      "location": "[LOCATION=lived; PARAGRAPH_INDEX=2]",
      "finding": "Describe the observable defect without proposing replacement prose.",
      "evidence_ids": ["gold-lilith-example-v5"]
    }
  ]
}
```

Every location must copy an exact supplied token. `evidence_ids` may be empty for fact and deterministic-rule findings. It must contain eligible comparison IDs for `owner_voice_drift`. Do not rewrite the card.
