# Sky Calendar meaning components v2

Status: `PENDING OWNER`. Nothing in this review set is approved or serving.

This set implements the owner architecture decision of 2026-08-14:

- astrology sources govern meaning;
- reader logic governs prose order;
- components may not be emitted verbatim as whole sentences;
- the first sentence must compose both positions into one shared condition;
- Forecast and Details both follow what may happen, why it matters, why it sticks or moves, and what can move.

## Contents

- `sky-calendar-meaning-components-v1.json`: 174 governed draft components with evidence pointers and hashes.
- Owner-review workbook: `outputs/sky-calendar-meaning-components-2026-08-14/sky-calendar-meaning-components-owner-review.xlsx`.

Counts:

- 144 sign units
- 5 aspect mechanisms
- 9 ordered modality pairs
- 16 ordered element pairs

All 174 rows fail closed until exact owner approval.

The frame-uniqueness gate is implemented in `scripts/sky-calendar-frame-uniqueness.mjs` and permanently tested by `scripts/test-sky-calendar-frame-uniqueness.mjs`.

## Owner-voice coverage

The wording pass uses two exact-approved source families for register and lived meaning:

- `fallback-hook/planet-lived/*`: 7 target planets have direct rows: Jupiter, Mars, Moon, Neptune, Pluto, Saturn, and Uranus.
- `fallback-hook/placement-sign-lived/*`: 56 approved rows cover all 12 signs. Of those, 46 are exact pairs among the 12 target Sky planets.

Coverage across the 144 target planet-sign units:

- 46 `owner_voiced_exact_pair`
- 49 `owner_voice_inferred_from_planet_and_sign`
- 13 `owner_voice_inferred_from_same_planet_and_sign`
- 36 `doctrine_meaning_owner_register_inferred`

The 36 doctrine-led units are all Sun, Chiron, and Lilith sign units. Those three points have neither a `planet-lived` row nor an exact `placement-sign-lived` row. Their governed doctrine still controls meaning; approved writing for the same sign supplies register only. Mercury and Venus also lack `planet-lived` rows, but their exact and same-planet `placement-sign-lived` rows supply point-specific owner voice.

Every sign has at least two owner-written placement rows. Exact source IDs, SHA-256 hashes, and the derivation class are visible on every Sign Units row and summarized in the Owner Voice Coverage sheet. Personal and second-person prose is converted for collective Sky; no source passage of eight or more words is copied verbatim.

## Wording-layer regeneration

The owner rejected the first wording layer because 142 sign units used the same mechanical join and their manifestations were unions of reusable planet and sign lists. A second pass fixed the joined position language but still built manifestations from three reusable frames per sign. The next pass replaced that slot system with manifestations authored separately for every planet-sign unit. The current schema removes the last positional template: there is no ordered `reader_manifestations` list. All 174 units carry named `supportive_realizations`, `neutral_realizations`, and `shadow_realizations` arrays, and the composer selects a meaning type from the aspect's argument shape. Array counts vary by unit. The evidence layer remains unchanged at SHA-256 `0ceb85f5897fb42238dfdd69e7b02271f87befe202f009da8659add9b9337c23`.

The regenerated wording layer has:

- zero uses of the old `expressed through` join;
- zero `details_language` values copied from `combined_position`;
- an opening-construction cap of 4, with an observed maximum of 4;
- 120 distinct two-word openings across 144 sign units: 103 used once, 11 used twice, 5 used three times, and 1 used four times;
- a reader-manifestation reuse cap of 2, with all 432 bullets unique and an observed maximum of 1;
- a reader-manifestation structural-skeleton cap of 3 after planet-specific noun stripping, with 432 distinct skeletons and an observed maximum of 1;
- a details-language reuse cap of 2, with all 144 phrases unique and an observed maximum of 1;
- a connective n-gram cap of 4, with an observed maximum of 4.
- zero abstract-subject violations in the planet, sign, combined-position, aspect, modality, and element meaning fields;
- zero verbatim matches of eight or more words against the owner-written personal-register sources.

These checks run during workbook generation and are pinned by `scripts/test-sky-calendar-meaning-components.mjs`.

## Owner systemic re-pass, 2026-08-15

The owner sampled Jupiter in Aquarius, Pluto in Cancer, and Chiron in Aries and found four faults distributed through the wording layer: source shadows dropped from otherwise positive meanings, abstractions acting like people, authored descriptions in place of recognizable behavior, and cumbersome constructions. The three owner-authored replacements are exact fixtures.

All 174 units were rechecked. The evidence pointers, source hashes, coverage classes, fail-closed policy, and `PENDING OWNER` status did not change.

- All 174 units changed schema; 8 sign units changed wording in this pass.
- 39 sign units were one-sided relative to their source challenge or shadow before the pass; 0 remain one-sided.
- Realizations now fail the build when an abstraction narrates itself, a known cumbersome construction returns, or a realization exceeds 22 words.
- Every formerly one-sided unit carries a concrete source-backed cost, overreach, avoidance, rigidity, or consequence.
- Eight owner-authored replacements are pinned by an exact regression test.
- The five latest owner samples removed analytical abstraction from 4 units, an assembled construction from 1, invented motive from 2, unsupported Taurus money vocabulary from 3, and unnecessary generic actors from 7.
- The Taurus evidence audit removed `budget` and `material` from Sun, `food`, `money`, and `shelter` from Moon, and `price` from Mercury. Money language remains only where that unit's own evidence supports it.
