# Warmth-harvest blocked scale-rule follow-up

Date: 2026-08-04

Status: implementation correction and regression coverage; no reader-copy, approval, serving, promotion, or billed-call change.

## Correct blocked packet shape

`build-aspect-writing-packet.js` must check `generationAllowed` before deriving a scale rule. A packet blocked by missing editorial data has no active harvest mode or insertion rule:

```json
{
  "harvest_mode": null,
  "insertWarmthBeat": false,
  "rule": "Packet blocked; no scale rule applies."
}
```

The underlying warmth-harvest flag remains:

```json
{
  "id": "missing-human-moment-beat",
  "severity": "editorial",
  "blocking": true,
  "reason": "Aspect entry has no human-moment beat. This is editorial data completeness; flag for editorial work. Do not request new owner prose."
}
```

This is a packet-metadata correction only. `generationAllowed: false` remains the controlling fail-closed gate, and `failedHarvest()` keeps its current internal mode value to avoid widening the downstream schema change.

## Re-derived full-card counts

The count must be derived from the 240 `missingTargets()` entries under:

```text
surface: sky-exact-aspect
format: full-card
```

Observed and regression-pinned result:

- 240 total targets
- 42 blocked by `missing-human-moment-beat`
- 198 ready targets
- 198 ready targets with `harvest_mode: matched`
- 0 ready targets with `harvest_mode: none_found`
- `198 + 0 = 198`

The previously reported `117 matched / 108 none_found` split sums to 225 and does not describe this 240-target full-card harvest. It must not be used as the current pipeline count.

## Required regression assertions

- A blocked writing packet never reports `insertWarmthBeat: true`.
- Its packet-level `scaleRule.harvest_mode` is `null`.
- Ready full-card mode counts are exactly `{ matched: 198, none_found: 0 }`.
- Ready full-card mode counts sum to 198.

## Editorial independence

Jupiter–Ascendant human-moment candidates remain proposals until explicitly approved as editorial input. This metadata/count correction does not wait on them and does not write them into governed entries.
