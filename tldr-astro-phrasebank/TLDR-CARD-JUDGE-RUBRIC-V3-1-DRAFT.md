# Card writing judge rubric v3.1 (comparison-based)

**Status:** `owner_approved`

**Version:** `card-writing-judge-rubric-v3.1`

**Approved:** 2026-08-10

**Approved source SHA-256:** `13efcb054da3187238d1f58c177c2f11071b58c27f65c5fe4337b2e9966b70ca`

**Surface:** `card`

**Owner approved:** `true`

**Active in harness:** `true`

**Active in production:** `false`

**Promotion authorized:** `false`

**Fixture-set status:** `owner_approved`

**Governance:** Owner-approved successor to card writing judge rubric v3. Active in the card-writing harness; candidate-writer activation and promotion remain off. Any later revision requires a new version and fresh owner approval. The owner ruled the v3 findings on `gold-lilith-sagittarius-v5` and `gold-lilith-pisces-v5` judge errors on 2026-08-09.

> I explicitly approve Card critique checklist v3.1 at SHA-256 ce9c9556e8325fd16d417baf5277e12c05064f89e61fb9cec6f3ffc4dabedf35 and Card writing judge rubric v3.1 at SHA-256 13efcb054da3187238d1f58c177c2f11071b58c27f65c5fe4337b2e9966b70ca, and confirm the 12 needs-review house-bleed noun blacklists in mechanism dataset SHA-256 23a1bf1d97daeb66f741b8967d64b702e90518d2ce3dd95f4ee3e297526a68e3.

This rubric preserves the v3 comparison-based architecture and adds finding-collision discipline, category-boundary evidence, and balanced MUST-FLAG evidence. It never authorizes writer promotion or a live evaluation.

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
| `shared_ban` | The card literally uses an enumerated shared-register banned string or invents a symptom, diagnosis, crisis, or outcome. Therapy-adjacent tone without an enumerated string is not enough. | `FAIL` |
| `specificity_ceiling` | The card states an unsupported event, motive, life status, or outcome as fact about the reader. Domain vocabulary, implication, and register drift do not qualify. | `FAIL` |
| `house_bleed` | A sign-only card is defined through its traditionally associated house domain rather than the supplied sign mechanism. One earned example is not enough; the domain must replace the mechanism. | `REVISE` |
| `stock_trope` | A familiar domestic, dating, therapy, workplace, or self-help shortcut stands in for the card's actual mechanism. Card wit and permission language are not stock tropes by themselves. | `REVISE` |
| `example_proves_astrology` | A concrete-looking example could illustrate almost any card and does not demonstrate the supplied mechanism. | `REVISE` |
| `metaphor_requires_translation` | The reader must translate figurative compression back into ordinary events before understanding what happened. Immediately understandable sharp language is allowed. | `REVISE` |
| `tagline_stands_alone` | The opening hook or tagline has no developed cause, stake, behavior, or consequence beneath it in the complete card. The presence of a hook, or a hook that is not independently explanatory, is not a defect. | `REVISE` |
| `owner_voice_drift` | Compared with the supplied same-surface exemplars, the card observably loses the owner's card register through generic filler, category-list abstraction, or unearned tonal imitation. This category requires eligible comparison evidence IDs. | `REVISE` |

Categories from v2 that merely penalized card voice are removed or folded into these definitions. `generic_self_help`, `clinical_shorthand`, and `advocacy_register_drift` route to `shared_ban`, `stock_trope`, or evidence-backed `owner_voice_drift` according to the actual defect. `observable_behavior` routes to `example_proves_astrology` or `tagline_stands_alone`. `literal_first_read_clarity` routes to `metaphor_requires_translation`. `redundancy` is not a standalone card defect.

## Collision and tier-boundary discipline

> When several categories describe the same underlying defect and require the same correction, return the narrowest causal defect as primary. Add a second defect only when it identifies a materially different problem requiring a separate correction.

> Before returning a secondary defect, state internally what separate edit would be required to fix it. If the same edit fixes both labels, suppress the secondary label.

If deleting the career-domain substitution fixes both alleged `house_bleed` and `owner_voice_drift`, only `house_bleed` survives. If a card has house bleed and separately ends in a generic self-help coaching line, those require two different edits, so both findings may survive.

FAIL-tier categories require independent evidence and are never filing locations for register or craft defects:

- `house_bleed` is the narrowest category whenever the defect is domain-substitution for a sign mechanism. A career-domain substitution is `house_bleed`, not `specificity_ceiling` — discussing a domain is not asserting a life status as fact.
- `specificity_ceiling` fires only when the card states an unsupported event, motive, status, or outcome AS FACT about the reader. Domain vocabulary, implication, or register drift never qualifies.
- `shared_ban` fires only on the enumerated banned strings and inventions, not on therapy-adjacent tone (that is `stock_trope` or evidence-backed `owner_voice_drift`).
- `astrology_integrity` requires independent evidence that the card contradicts supplied astrology facts or assigns an unsupported astrological function.

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
| `gold-lilith-sagittarius-v5` | `owner_voice_drift` |
| `gold-lilith-pisces-v5` | `owner_voice_drift` |

These controls do not excuse real defects in another candidate. The do-not-flag controls protect card-register *traits*; they do not protect *defective instances* of those traits.

## Owner ruling on the v3 run-one gold findings

- Call 9, `gold-lilith-sagittarius-v5`: judge error. Preserve the owner-locked card unchanged. `owner_voice_drift` is a prohibited recurrence.
- Call 12, `gold-lilith-pisces-v5`: judge error. Preserve the owner-locked card unchanged. `owner_voice_drift` is a prohibited recurrence.

## Concreteness and mechanism interiority

> Concrete does not mean adding a random object or domestic scene. Concrete means naming the observable behavior, circumstance, decision, or consequence produced by the astrology.

When a placement's mechanism is internal (belief, escape, numbing), observable naming of the internal behavior satisfies concreteness; demanding external props for an internal mechanism is a judge error.

Comparison sets must match mechanism exteriority where the gold set allows. `gold-lilith-sagittarius-v5` and `gold-lilith-pisces-v5` therefore use function-matched comparison cards whose mechanisms are also internal behaviors. Do not treat a more externally staged comparison card as a demand that an internal mechanism acquire an unrelated object, domestic scene, or external event.

## Governed mechanism record and citation boundary

The judge never judges from its own astrology knowledge. The packet supplies one provenance-labeled `MECHANISM_RECORD` containing:

- the placement's owner-reviewed core theme or wound;
- its owner-reviewed manifestation space;
- an `interiority` tag;
- its governed DO-NOT-ASSUME list; and
- its review-gated house-bleed noun blacklist.

Use only `ASTROLOGY_FACTS` and `MECHANISM_RECORD` for astrology, theme, manifestation-space, interiority, and house-bleed judgments. Astrology knowledge from training priors is forbidden.

Every finding must cite at least one exact supplied mechanism element ID under `mechanism_citations`. A theme, concreteness, specificity, house-bleed, or drift finding with no valid mechanism citation is invalid and receives no semantic result. `owner_voice_drift` additionally requires eligible same-surface comparison evidence IDs.

The per-placement noun blacklist runs deterministically before the model call. A blacklist term becomes house-bleed evidence only when the configured noun threshold is met in one card field and that field contains none of the placement's mechanism anchors. This preserves an earned domain example while mechanically catching domain substitution. The model may still return `house_bleed` for non-blacklist substitutions, but it must cite the supplied mechanism element the substitution violates.

The comparison manifest records the `interiority` tag for every gold card. Comparison evidence must match the candidate's interiority where the gold set allows.

The fixture plan includes a mechanism-violation pair for every sign. V3.1 seeds Sagittarius and Capricorn from the existing house-bleed degradations; the remaining ten accumulate as owner-reviewed families are rewritten.

## Labeled category-boundary evidence from v3 run 1

### Call 14 — `neg-capricorn-career`

Actual fixture text:

> The boss passes over the promotion again. The title never matches the job. Career status stalls while the professional hierarchy protects itself.

Wrong filing: `specificity_ceiling` plus `owner_voice_drift`.

Correct filing: `house_bleed` primary. The career domain substitutes for the Capricorn sign mechanism. Discussing that domain is not itself an unsupported life-status assertion. Deleting the domain substitution is one correction, so collision labels do not survive.

### Call 15 — `neg-sagittarius-9th`

Actual fixture text:

> A teacher gets challenged at the university. A publication prints a correction. Travel plans and legal matters expose what the institution taught wrong.

Wrong filing: `owner_voice_drift`.

Correct filing: `house_bleed` primary. Ninth-house domains substitute for the Sagittarius sign mechanism.

### Call 18 — `neg-aquarius-selfhelp`

Actual fixture text:

> Embrace your uniqueness. Your authentic self is your superpower, and the universe rewards those who dare to stand out.

Wrong filing: the supported REVISE-tier categories plus a spurious `specificity_ceiling`, which escalated the runtime verdict to FAIL.

Correct filing: `stock_trope` primary, with evidence-backed `owner_voice_drift` only if it identifies a materially separate correction. Generic empowerment language is a craft/register defect, not an unsupported event, motive, status, or outcome asserted as fact.

### Call 20 — `neg-virgo-clinical`

Actual fixture text:

> It is time to heal the perfection wound and reparent the inner critic.

Wrong filing: `shared_ban` for therapy shorthand.

Correct filing: `stock_trope` unless an enumerated banned string is literally present. Therapy-adjacent tone is not independently a shared-ban finding.

## Labeled MUST-FLAG exemplars

### `stock_trope` / `example_proves_astrology` — call 13

MUST FLAG `neg-aries-dishes`:

> Someone's temper is shorter than usual, and it is not really about the dishes.

The dishes are a generic prop. They do not demonstrate the supplied Aries mechanism. File the narrowest supported causal defect rather than stacking sibling labels for the same correction.

Gold counterpart `gold-lilith-aries-v5`, lived field; do not flag:

> Until {{exitDate}}, the anger that was easier to put away starts coming back up. The quiet coworker pushes back in the meeting and does not apologize for it. Someone stops waiting for permission and acts, then deals with the fallout. Small slights land harder because they are landing on top of older ones. Years of held anger can come out at whoever happens to be closest instead of at what actually caused it.

### `metaphor_requires_translation` — call 16

MUST FLAG `neg-pisces-well`:

> Some people will drain a well dry and then blame it for being empty.

The reader must translate the figurative well into ordinary events. The supplied complete card does not do that translation.

Gold counterpart `gold-lilith-pisces-v5`, turn field; do not flag:

> Pisces likes to dissolve, to blur the edges, but Lilith cuts through the fog. Past experience can make the options look like absorb everything or disappear. When those are the only two settings, every demand can start feeling like too much and checking out can start feeling like relief. Some people will keep taking support as long as it is available, then resent the person who finally runs out. A limit creates another option: staying present without absorbing everything.

### `tagline_stands_alone` — call 17

MUST FLAG `neg-taurus-tagline`:

> The bargain ends.

The replacement tagline is undeveloped by the supplied complete card and therefore stands alone.

Gold counterpart `gold-lilith-taurus-v5`, tagline field; do not flag:

> Being treated like less stops being acceptable

## Output contract

Return strict JSON:

```json
{
  "findings": [
    {
      "category": "owner_voice_drift",
      "location": "[LOCATION=lived; PARAGRAPH_INDEX=2]",
      "finding": "Describe the observable defect without proposing replacement prose.",
      "evidence_ids": ["gold-lilith-example-v5"],
      "mechanism_citations": ["manifestation_space.body"]
    }
  ]
}
```

Every location must copy an exact supplied token. `evidence_ids` may be empty for fact and deterministic-rule findings. It must contain eligible comparison IDs for `owner_voice_drift`. `mechanism_citations` must contain one or more exact IDs from the supplied mechanism record for every finding. Apply the collision rule before returning the findings. Do not rewrite the card.
