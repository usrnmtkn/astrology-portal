# Timing-event source V9 engine candidate

Status: meaning layer `approved`. Serving: `false`. The owner explicitly approved the exact ten new V9 meaning records on Aug 3, 2026. This does not make any reader mapping eligible.

## Completed calculation work

- Ingresses now carry `passType: initial | re-entry | final`, derived from the immediately preceding ephemeris sign crossing. Direct Swiss Ephemeris regressions cover Neptune and Uranus across five initial, retrograde-return, and final-entry events.
- Mercury, Venus, and Mars pre-shadow and post-shadow windows are calculated from the two station degrees and exposed only through `getNonServingTimingEventCandidates`.
- Exact Mercury and Venus conjunctions with the Sun are emitted in the non-serving candidate feed at the approved 17-arcminute named threshold. Each candidate preserves direct or retrograde motion explicitly. The one-degree `nearSun` measurement remains metadata and does not create a named event.
- The Mars-Sun opposition at the center of a Mars retrograde is calculated as `sun-opposition`, and candidates are rejected unless Mars is retrograde at exactness.
- Reader calendar feeds remain unchanged. A regression asserts that shadow, cazimi, and Mars-midpoint candidates cannot appear there.

## Meaning candidate

The approved meaning collection is `data/timing/timing-event-sources-v9.json`.

- 31 source records total.
- 21 previously approved V8 records remain `REVIEWED`.
- 10 newly engine-backed V7 records are now also `REVIEWED`: six shadow records, two retrograde-cazimi records, the Mars-Sun opposition record, and the shared ingress re-entry record.
- 636 concrete, underscore-normalized mappings total; all remain `needs_review` and `serving: false`.
- The 204 new mappings comprise 72 shadow keys, 24 retrograde-cazimi keys, 12 Mars-midpoint keys, and 96 sign-specific re-entry keys.

## Still requiring an owner decision

1. Direct Mercury and Venus cazimi policy. The engine distinguishes and calculates direct conjunctions, but V7 contains meaning records only for the retrograde inferior conjunctions. Direct cazimis therefore remain a source gap. Either commission two direct-cazimi meaning records or explicitly keep those events fact-only and cardless.
2. Reader-copy generation and exact wording approval for the 204 new V9 mappings. Meaning-layer approval alone does not supply those bodies.
3. A completed judge pass after OpenAI API credits are restored. The pipeline can resume from the preserved drafts without repeating the writer calls.

The exact four V2 pilot bodies are owner-approved but remain non-serving because reader import and calendar wiring were not authorized. No other timing candidate may be attached to the reader calendar until its complete reader copy receives separate exact-wording approval.
