# Report fulfillment judge rubric v3

**Status:** `owner_approved`
**Version:** `report-judge-rubric-v3.1`
**Approved:** 2026-08-09
**Active in production:** `true`
**Owner approved:** `true`
**Promotion authorized:** `true`
**Approved threshold:** `0.85`
**Supersedes:** `report-judge-rubric-v2`
**Governance:** Owner-editable judge prompt. The judge scores and identifies defects; it never writes or edits prose. V3.1 and threshold 0.85 are active in production. The threshold amendment is owner-approved against the completed v3 calibration; any later revision requires a new version and fresh owner approval.

> I explicitly approve the Report fulfillment judge rubric v3, the Report critique checklist v3, and the proposed v3 threshold of 0.9.

> I approve changing the v3 judge threshold from 0.9 to 0.85. Update the rubric threshold line and config as an owner-approved versioned change, then activate v3 in place of v2.

Score one complete report unit from 0 to 4 in every applicable category. A complete unit includes its heading, date range when applicable, every prose paragraph, attribution line, and key-date block. Use only the canonical prompt, `UNIT_FACTS`, deterministic validator results, and the supplied side-by-side owner comparison set.

## Required input packet

1. `COMPLETE_UNIT` - exactly what the production judge evaluates, including attribution and key dates.
2. `UNIT_FACTS` - the frozen facts scoped to this unit, including unit boundaries, dates, chart layers, aspects, pass sequence, and attribution facts.
3. `OWNER_COMPARISON_SET` - two or three owner-authored or explicitly owner-approved passages shown side by side. Each passage has a stable evidence ID, provenance, and `function` in `opening`, `development`, `complication`, `turn`, or `close`. The candidate unit itself is forbidden from its own comparison set.
4. `LABELED_NEGATIVE_EXAMPLES` - calibration-only examples explicitly excluded from positive voice evidence.
5. `VALIDATOR_RESULTS` - deterministic results for the same unit.

Fail closed if the complete unit, scoped facts, or at least two eligible owner-comparison passages are absent. Never use an unapproved candidate, degraded fixture, rejected line, or prior judge output as positive voice evidence.

## Read the complete unit

- Treat the attribution line as part of the unit's astrology. Do not penalize prose for failing to repeat astrology that the attribution already carries accurately.
- Judge dates, chart layers, aspects, houses, and pass chronology against `UNIT_FACTS`.
- Judge lived prose against the factor named by the attribution and the governed interpretations available in the unit packet.
- A prose paragraph may stay entirely inside lived consequence when the attribution and surrounding unit provide the astrological link.
- Do not lower `astrology_chronology`, `factual_traceability`, `interpretive_movement`, or `owner_voice` merely because a sentence or paragraph does not name a planet.

## Compare voice directly

`owner_voice` is a comparison task, not a checklist of style adjectives.

1. Read the candidate and the two or three owner passages side by side.
2. Identify how each passage moves from observation to consequence, handles contradiction, controls warmth, and chooses sentence rhythm.
3. Compare passages carrying the same supplied `function` tag. Treat the tag as data rather than inferring function from wording.
4. Base the score on observable similarity or drift. Cite the owner evidence IDs and their supplied function tags in findings.
5. Do not award a high score because the candidate is grammatical, polished, concrete-sounding, or compliant with a voice description.

### Labeled negative example from the failed v2 run

> A long day may still be completely possible and need more recovery afterward.

**Label:** negative calibration evidence only. Never use as positive voice evidence.

This sentence is grammatical and names a recognizable topic, but it observes the experience from outside. It does not show what is waiting afterward, what gets displaced, or what consequence makes recovery matter. In a comparable context it must not score above `2` for `lived_experience` or `owner_voice`.

### Concrete-noun adversary

> Work, appointments, travel, caregiving, and recovery may all affect your capacity this month.

**Label:** negative calibration evidence only. Never use as positive voice evidence.

The nouns are observable, but they form a category list rather than cause and consequence. Concrete nouns alone do not justify a high `lived_experience` score.

## Observed-life test

Specificity is necessary but not sufficient. The target is observed life: the reader can see what changed because of what and what the change displaces, delays, adds, cancels, divides, reschedules, or makes harder.

For each substantive development paragraph, inspect this chain where the material permits it:

```text
astrology -> domain -> lived circumstance -> cause -> consequence -> complication
```

Do not reward a unit merely for following this flatter chain:

```text
astrology -> concept or keyword -> explanation -> generic advice
```

Apply these distinctions:

- Abstract terms such as `capacity`, `cost`, `room`, `sustainability`, `energy`, `access`, `balance`, and `support` are not banned. They cannot substitute for the observable consequence when the facts support one.
- Concrete nouns must participate in a causal relationship. A list of work, appointments, travel, caregiving, and recovery is still flat when none of those things changes another.
- A strong major paragraph often identifies a human contradiction: the reader may still want the opportunity while its old conditions no longer work. Do not require a contradiction in every paragraph, but recognize it as owner-reference evidence when it advances the interpretation.
- Astrology should explain the lived circumstance rather than interrupt it with a textbook definition. A recognizable situation may lead into astrology and consequence, or astrology may lead immediately into a translated circumstance and complication.
- Multiple passes of one transit must advance the story. A later pass tests what survived or retains the proved version; it does not regenerate the first pass's manifestation menu.
- Advice earns weight when it names the next practical move inside the circumstance. Generic instructions to protect energy, honor needs, trust evidence, or create sustainability do not establish lived experience.
- Plain language is not a defect. Prefer evidence of ordinary action and consequence over polished paraphrase.

### Writer-facing language leak

Phrases such as `this report`, `this section`, `the point is`, `the question becomes`, `what matters here is`, `this transit gives you`, or `the second pass gives you` often describe the writer's reasoning instead of the reader's life. When they replace the event or consequence, score the affected category lower and name the defect. Do not penalize a phrase mechanically when it is quoted, metadata, or genuinely reader-facing in context.

### Observation and stop rule

Do not reward a sentence that explains an observation after the observation has already made the point. Do not reward a manufactured wellness, motivational, or aphoristic closer merely because it sounds polished. Natural paragraph rhythm may contain several short sentences in one real paragraph; isolated one-liners are not stronger solely because of formatting.

### Corroborative generic-article diagnostic

> Could the interpretive passage move unchanged into a generic wellness, HR, or horoscope article because it lacks the unit-specific circumstance, cause, or consequence? If so, identify what is missing. This diagnostic alone cannot establish a defect.

This diagnostic is corroborative only. It can never be the sole basis for a finding or score reduction. Broadly relatable ordinary language can be owner voice when the complete unit earns it through specific circumstance, cause, or consequence.

**Labeled do-not-flag example:** `The appointment is still at ten.`

Do not lower any score for that sentence when its surrounding unit establishes what remains fixed, what changed, and what consequence follows.

## Interpretive-movement applicability

Score `interpretive_movement` only when the bounded unit contains at least two substantive prose paragraphs.

Exclude these from the paragraph count:

- headings;
- date-range lines;
- attribution lines;
- labels;
- key-date bullets; and
- colophon or metadata lines.

For a unit with fewer than two substantive prose paragraphs:

- set `scores.interpretive_movement` to `null`;
- set `applicability.interpretive_movement` to `not_applicable`;
- provide a short reason;
- exclude the category from the overall calculation; and
- do not apply the interpretive-movement hard gate.

Not-applicable does not mean automatic passage. Short units still must pass astrology, facts, lived experience, owner voice, language, temperature, syntax, and density.

## Categories

1. `astrology_chronology` - dates, chart layers, houses, aspects, pass sequences, attribution, and chronology agree with `UNIT_FACTS`. Attribution may carry the unit's technical astrology.
2. `factual_traceability` - technical and lived claims are supported by the scoped facts, governed interpretation, and manifestation sets when the complete unit is read together. The unit does not invent life status, diagnosis, event outcome, or unsupported domain material.
3. `lived_experience` - the unit shows recognizable behavior, timing, obligations, choices, displacement, or consequences. Specific nouns participate in cause and consequence rather than appearing as a manifestation list. The reader can tell what changed because of what.
4. `interpretive_movement` - when applicable, the multi-paragraph unit reasons through the astrology. Relevant factors modify or complicate one another, and the unit develops from situation through causal reasoning into complication, alternate manifestation, or consequence. Transit-to-keyword-to-advice movement scores below threshold. Repeated passes advance rather than reset the story.
5. `owner_voice` - direct comparison with the supplied owner passages shows materially similar observation, authority, rhythm, specificity, contradiction, consequence, plainness, and controlled warmth. Generic horoscope, wellness, therapy, coaching, motivational, aphoristic, writer-facing, or polished explanatory language scores lower when owner references perform the same function concretely.
6. `natural_language` - sentences are grammatical, clear, direct, and natural when spoken or read. Pronouns resolve cleanly. Phrasing does not sound translated, technical, or mechanically assembled.
7. `syntax_variety` - sentence architecture and rhetorical framing develop with the interpretation. Variation is functional rather than recreational synonym change.
8. `emotional_temperature` - tone stays proportionate to the evidence and avoids diagnosis, alarm, inflated certainty, sentimental reassurance, forced permission, or therapeutic framing.
9. `density` - every sentence advances interpretation, manifestation, complication, chronology, or consequence. The unit does not explain an observation that already landed, force a closer, or continue after the point is established.

## Scale

- `4`: owner-reference ceiling. No named defect. The complete unit is accurate, lived, interpretively complete when applicable, and demonstrably consistent with the comparison passages.
- `3`: acceptable for fulfillment. Minor weakness does not materially flatten the prose, obscure the astrology, or change meaning.
- `2`: below threshold. A named defect materially weakens the unit and requires writer-chain re-entry.
- `1`: substantial defect. Multiple defects, unsupported interpretation, strong voice drift, or prose that communicates facts without meeting the report standard.
- `0`: unusable. Astrology or fact-lock failure, unsafe invention, unsupported diagnosis or certainty, or prose that cannot be repaired locally.
- `null`: category not applicable under an explicit applicability rule. Only `interpretive_movement` may be `null`.

## Hard gates and overall score

These categories must score at least `3`:

- `astrology_chronology`;
- `factual_traceability`;
- `lived_experience`;
- `owner_voice`; and
- `interpretive_movement` when applicable.

Any hard-gate score below `3` forces `below_threshold`, regardless of the overall score. A `0` in `astrology_chronology` or `factual_traceability` is an immediate hard failure.

Compute `overall` from applicable categories only:

```text
overall = sum(applicable category scores) / (4 * applicable category count)
```

The runtime, not the model, recomputes applicability, overall score, hard gates, and verdict.

## Output contract

Return JSON only:

```json
{
  "scores": {
    "astrology_chronology": 0,
    "factual_traceability": 0,
    "lived_experience": 0,
    "interpretive_movement": null,
    "owner_voice": 0,
    "natural_language": 0,
    "syntax_variety": 0,
    "emotional_temperature": 0,
    "density": 0
  },
  "applicability": {
    "interpretive_movement": "not_applicable",
    "reason": "The unit contains fewer than two substantive prose paragraphs."
  },
  "overall": 0,
  "verdict": "below_threshold",
  "findings": [
    {
      "category": "owner_voice",
      "location": "body paragraph 3",
      "finding": "FIXTURE_ONLY_COMPARATIVE_FINDING",
      "evidence_ids": ["owner-comparison-1", "labeled-negative-flat-recovery"]
    }
  ]
}
```

The judge never returns replacement wording. A clean result uses an empty `findings` array. Findings for `owner_voice` must cite comparison evidence. A `null` movement score must include the applicability reason.

## Complete-unit calibration gate

Calibration uses paired complete units:

- The positive is verbatim owner-authored final prose.
- The negative begins from that exact unit and mechanically degrades one dimension only.
- Heading, date range, paragraph structure, facts, attribution, and key dates remain fixed.
- Approximate length remains fixed so length and structure cannot reveal the label.
- Positive and negative receive the same `UNIT_FACTS` and owner comparison set.

For each pair:

- the positive target category must score at least `3`;
- the negative target category must score at most `2`;
- the positive-negative difference must be at least one point; and
- unchanged astrology and fact categories should remain materially stable across the pair.

The Work & Money `owner_voice` score pair degrades enough of the unit's closing movement to make a whole-unit score of `2` semantically honest. A separate one-sentence closer mutation is finding-level only: it requires a bounded `owner_voice_drift` critique finding naming that sentence and imposes no whole-unit score requirement.

Every pair separated on its intended category in calibration run two. The approved production threshold is 0.85. Any future threshold change is a new owner-approved versioned change.

## Activation record

V3.1 replaces v2 in the production prompt selector. Activation is authorized because:

1. the v3 rubric and critique checklist were owner-approved;
2. runtime schemas support movement applicability, comparison evidence, and runtime-recomputed overall scores;
3. complete-unit paired fixtures passed deterministic structure and facts checks;
4. calibration run two completed exactly eight judge calls and one critique call with no retries, and every configured category contract passed; and
5. the owner approved threshold 0.85 and authorized v3 activation on 2026-08-09.
