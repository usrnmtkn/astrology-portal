# Sky Calendar meaning components v2

Status: `OWNER APPROVED` on 2026-08-16. The 174 meaning components are hash-pinned in `exact-approval.json`. The approval source names the exact Codex task and turn so an auditor can resolve it. No composed forecast is serving.

This set implements the owner architecture decision of 2026-08-14:

- astrology sources govern meaning;
- reader logic governs prose order;
- components may not be emitted verbatim as whole sentences;
- the first sentence must compose both positions into one shared condition;
- Forecast and Details both follow what may happen, why it matters, why it sticks or moves, and what can move.

## Contents

- `sky-calendar-meaning-components-v1.json`: 174 governed, exact-owner-approved components with evidence pointers and hashes.
- `exact-approval.json`: the canonical per-component payload hashes and the hash of the complete approved set.
- `serving-authorization.json`: the versioned machine authorization. It pins the composer version, composer-and-gates source hash, and approved component-set hash. It remains inactive until the owner confirms the eight-card unscripted pilot.
- Owner-review workbook: `outputs/sky-calendar-meaning-components-2026-08-14/sky-calendar-meaning-components-owner-review.xlsx`.

Counts:

- 144 sign units
- 5 aspect mechanisms
- 9 ordered modality pairs
- 16 ordered element pairs

All 174 components are exact-owner-approved. The composer verifies each component against its approved payload hash and still fails closed on missing, unapproved, or modified components. The owner has chosen a machine-authorization model for composed Forecast and Details copy: once the eight-card pilot is confirmed, cards may serve only from the exact composer and component hashes recorded in `serving-authorization.json`. Any composer, gate, or component change voids that authorization.

Approval records follow one standing rule: agents prepare them unsigned; only the owner marks an approval or activates serving. Cross-session decisions must cite a resolvable tool, task or thread ID, and date.

## Standing composed-card audit

After serving is activated, sample live composed cards with:

```text
node scripts/sample-live-sky-composed-cards.mjs --input <live-cards.json> --count <N> --out <owner-audit-sample.json>
```

The sample includes Forecast, Details, realization selections, every component input and payload hash, the composer version and source hash, and the component-set hash. The command fails closed while serving is inactive or when either authorized hash has drifted.

Cadence: sample 12 cards weekly for the first eight weeks after activation, then 20 cards monthly. Run an additional sample immediately after every owner-authorized composer or component version change.

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
- a reader-manifestation reuse cap of 2, with all 496 realizations unique and an observed maximum of 1;
- a reader-manifestation structural-skeleton cap of 3 after planet-specific noun stripping, with 496 distinct skeletons and an observed maximum of 1;
- a details-language reuse cap of 2, with all 144 phrases unique and an observed maximum of 1;
- a connective n-gram cap of 4, with an observed maximum of 4.
- zero abstract-subject violations in the planet, sign, combined-position, aspect, modality, and element meaning fields;
- zero verbatim matches of eight or more words against the owner-written personal-register sources.

These checks run during workbook generation and are pinned by `scripts/test-sky-calendar-meaning-components.mjs`.

## Owner systemic re-pass, 2026-08-15

The owner sampled Jupiter in Aquarius, Pluto in Cancer, and Chiron in Aries and found four faults distributed through the wording layer: source shadows dropped from otherwise positive meanings, abstractions acting like people, authored descriptions in place of recognizable behavior, and cumbersome constructions. The three owner-authored replacements are exact fixtures.

All 174 units were rechecked. The evidence pointers, source hashes, coverage classes, and fail-closed policy did not change. The later exact owner approval is recorded separately in `exact-approval.json`.

- All 174 units changed schema; 8 sign units changed wording in this pass.
- 39 sign units were one-sided relative to their source challenge or shadow before the pass; 0 remain one-sided.
- Realizations now fail the build when an abstraction narrates itself, a known cumbersome construction returns, or a realization exceeds 22 words.
- Every formerly one-sided unit carries a concrete source-backed cost, overreach, avoidance, rigidity, or consequence.
- Eight owner-authored replacements are pinned by an exact regression test.
- The five latest owner samples removed analytical abstraction from 4 units, an assembled construction from 1, invented motive from 2, unsupported Taurus money vocabulary from 3, and unnecessary generic actors from 7.
- The Taurus evidence audit removed `budget` and `material` from Sun, `food`, `money`, and `shelter` from Moon, and `price` from Mercury. Money language remains only where that unit's own evidence supports it.

## Realization classification check, 2026-08-15

The classification review changed no wording. It checked the 13 sign units that had been filed entirely as neutral and the 10 sign units that had been filed entirely as shadow against each unit's own governed evidence.

- 44 existing realizations moved to a different typed pool.
- 0 of the reviewed 13 remain all-neutral.
- 1 of the reviewed 10 remains all-shadow: `sky-sign/neptune/libra`.
- The prompt's 10-unit count refers to the all-shadow population. Across all shapes, 81 sign units originally had no supportive realization; 64 still have no supportive realization after this evidence-only reclassification.
- The evidence pointers, hashes, coverage classes, fail-closed status, and eight exact owner-authored replacements remain unchanged. The later exact owner approval is recorded separately in `exact-approval.json`.

The composer now fails closed when the aspect's required realization type is empty. It records the named gap `sky-calendar-missing-required-realization`; it never substitutes neutral or shadow material into a trine or sextile. The complete unit-by-unit classification record is in `REALIZATION-CLASSIFICATION-AUDIT.md` and the workbook's Classification Audit sheet.

## Supportive-pool extraction, 2026-08-16

The owner authorized an additive editorial extraction for the 64 supportive pools left empty after classification review. Exactly one supportive realization was extracted for each unit from that unit's own governed sign evidence. Every addition records its realization, source ID, and source hash in `supportive_realization_evidence`.

- Supportive realizations added: 64
- Existing realizations rewritten, removed, or reclassified: 0
- Empty supportive pools remaining: 0
- Previously blocked trine/sextile sign routes: 1,345 of 2,040
- Routes unblocked by the extraction: 1,345
- Routes still blocked for missing supportive material: 0
- Units whose evidence could not support an extraction: 0

At this historical checkpoint, all units remained `PENDING OWNER`. The eight owner-authored replacements preserve every previously locked string; four receive one authorized additive supportive realization because their supportive pool was empty. The complete extraction ledger is in `SUPPORTIVE-POOL-EXTRACTION-REPORT.md` and the workbook's Sign Units sheet. The later exact owner approval is recorded in `exact-approval.json`.

The counts above record the completed extraction pass at that checkpoint. The later targeted classification verification below correctly moved three items out of the supportive pool, creating three temporary gaps that were resolved in the closing coverage pass.

## Targeted classification verification, 2026-08-16

All 44 realizations moved during the earlier classification audit were checked again against their own governed evidence and the meaning required by each pool.

- 42 classifications hold.
- 2 classifications were corrected: Sun in Sagittarius and Saturn in Aquarius moved from supportive to neutral.
- 1 separately reported error was corrected: Neptune in Sagittarius moved from supportive to shadow.
- Realization wording changed: 0.
- Empty supportive pools after the corrections: 3.
- Supportive realizations flagged as near-restatements of their unit's combined position: 27. These are flags only; they were not rewritten or reclassified in this pass.

The full evidence-backed result is in `TARGETED-CLASSIFICATION-VERIFICATION.md`, `targeted-classification-verification.json`, and the workbook's Targeted Verification sheet.

## Supportive coverage closing pass, 2026-08-16

The three pools emptied by targeted verification were checked against their own governed evidence. Sun in Sagittarius, Saturn in Aquarius, and Neptune in Sagittarius each had a constructive act available without borrowing doctrine. Adding those three realizations reduces the current trine/sextile blocked-route count from 98 to 0.

The 27 supportive near-restatement flags were also checked as a coverage question:

- 15 were the unit's only supportive realization and received one distinct, evidence-backed supportive realization.
- 12 belonged to units that already carried other supportive material and were left unchanged.
- 26 flagged realizations remain supportive.
- `sky-sign/chiron/virgo` keeps its exact wording but moves from supportive to shadow because it describes insecurity and repeated correction rather than help or ease.
- Existing wording rewritten: 0.
- Empty supportive pools now: 0.
- All 174 units are now `OWNER APPROVED`; composed cards remain separately owner-gated and nothing serves from this review set.

The complete evidence ledger is in `SUPPORTIVE-COVERAGE-CLOSING-REPORT.md`, `supportive-coverage-closing-report.json`, and the workbook's Coverage Closing sheet.
