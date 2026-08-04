# Timing-event corpus warmth contract V1

Status: authoring pipeline only. Serving, generation, reader wiring, and promotion are not authorized by this contract.

Calendar timing packets use the owner-approved corpus warmth harvest as the selection method for composition component six, **owner voice models**. The builder is `packages/astro-knowledge/scripts/timing-warmth-harvest.js`; its standing source-family map is `packages/astro-knowledge/config/timing-warmth-harvest-v1.json`.

## Packet rules

1. The emotional core is named from the reviewed V9 meaning record for the event family and phase. It is never inferred from the planet alone. Lunations use the approved lunation macro supplied to the builder.
2. A missing or unnameable core is `EMOTIONAL_CORE_UNNAMED` and fails closed for editorial work.
3. The standing source map narrows the owner corpus by event family. Event-time facts refine the search: the phase changes its vocabulary, and an ingress or lunation sign narrows the eligible season or lunation articles.
4. Only owner-authored final lines that turn toward the reader qualify. A line must name a feeling from inside or give concrete permission or reassurance, and it must survive the ban list without repair.
5. Current Sky packets are collective. The original owner line remains unchanged in provenance; the candidate `usedForm` is minimally collectivized before it reaches the writer.
6. A full card receives one to three `ownerFoundationLines` and the instruction to adapt at most one. If a line is used, the card records `warmthSource: { sourceArticleId, originalLine, usedForm }` and the evidence label `owner-corpus-derived`.
7. Full cards may place one warmth beat in paragraph two, after the phase pressure or cost and before the close. A second warmth beat or a second conclusion fails the stacked-ending rule.
8. Preview packets use `harvest_mode: vocabulary_only`, receive no foundation lines, and may not add a warmth beat.
9. Moon ingress returns no packet. Dates, event times, degrees, phase detection, ingress pass type, and the 17-arcminute cazimi threshold remain calculation-owned.
10. Meaning provenance and CC/AC/SD/Rodden claim tags remain separate from `warmthSource`. Approval gates are unchanged.

## Judge addition

The timing judge consumes the following rules verbatim from `timingJudgeInstructions()`:

> The card's turn toward the reader must trace to the supplied owner foundation lines when present. Invented permission or reassurance in place of supplied material scores 2; no turn at all when foundation lines were supplied scores 2. Verbatim use of a supplied owner line is never copying. The warmth line must match the PHASE's core; a station-direct reassurance on a station-retrograde card is a phase mismatch and scores 1.

The normal Current Sky, natural-English, astrology-drift, scene-shape, timing-fact, pass-type, generic-swap, flat-voice, and stacked-ending checks remain in force.

## V2 exemplars

The four owner-approved V2 timing cards remain immutable format exemplars:

- Mercury stations retrograde in Pisces
- Venus retrograde in Scorpio
- Chiron stations retrograde in Taurus
- Jupiter enters Leo

They are preserved in `packages/astro-knowledge/review/timing-event-reader-copy-v2-approved.json`. The harvest contract does not revise their wording or approval state.
