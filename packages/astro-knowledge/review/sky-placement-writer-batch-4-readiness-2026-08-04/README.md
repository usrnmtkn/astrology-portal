# Sky Placement writer batch 4 preflight

Recorded 2026-08-04. The deterministic preflight made no billed calls. After the corrected harvest was finalized, the owner authorized seven Sol-xhigh writer-only calls; all seven completed and no Terra calls were made.

## Readiness by requested unit

| Unit | Full packet | Engine facts | Self-lint | Harvest | Result |
|---|---:|---:|---:|---|---|
| Mars in Sagittarius | pass | pass | 25/25 | none_found, non-blocking | ready |
| Mars in Aquarius | pass | pass | 25/25 | none_found, non-blocking | ready |
| Mars in Pisces | pass | pass | 25/25 | none_found, non-blocking | ready |
| Neptune in Aries | pass | pass | 21/21 | none_found, non-blocking | ready; optional previous-residency slot omitted |
| Pluto in Aquarius | pass | pass | 25/25 | none_found, non-blocking | ready |
| Chiron in Aries | pass | pass | 22/22 | matched: wound carried differently | ready; optional concurrent-event slot omitted |
| Nodes in Aquarius/Leo | pass as one axis packet | pass as one axis plan | 23/23 | matched: expression without applause | ready; optional concurrent-event slot omitted |

All seven requested units compiled as complete packet plans before the authorized writer run.

## Implemented batch-4 support

- The engine-facts helper now supports Chiron, North Node, and South Node. South Node signs and boundaries are derived from the true-node longitude plus 180 degrees.
- `--planet nodes --sign aquarius-leo` builds one combined axis fact plan and one combined packet.
- The axis packet carries the explicit reciprocal pair link `north-node-aquarius<->south-node-leo` and the fallback content key `fallback-hook/sky-sign-copy/nodes/aquarius-leo`.
- Neptune, Pluto, Chiron, and both node rows carry the supplied supported domains, warnings, and scenario policy.
- Chiron and both node rows remain `runtimeEligible: false`; serving is outside this preflight.

## Corrected warmth harvest

The first Chiron and Nodes `none_found` results were lookup misses, not completed corpus misses: the governed foundation table had no exact records for `chiron/aries` or `nodes/aquarius-leo`. Chiron wound and healing terms were also inside a global incompatible-evidence regex. The filter now licenses literal wound and healing language for Chiron targets while continuing to reject unrelated war metaphors such as `battlefield`.

- Chiron in Aries now matches `owner-article:chiron-retrograde-in-aries:p009`: “Chiron does not promise that the wound disappears. It shows us how to carry it differently.”
- Nodes in Aquarius/Leo now matches `owner-article:this-weeks-astrology-august-24th-31st:p015`: “Creative expression does not require applause to exist.” This is the same primary source used by the Jupiter in Leo harvest. Two Leo applause alternates are also retained.
- The other five batch-4 units remain `none_found`, non-blocking, under OV-042.

## Authorized writer run

Seven Sol-xhigh writer-only calls completed. Every result remains `needs_review`, `ownerApproved: false`, `promotionAuthorized: false`, noncanonical, and render-ineligible. No Terra judge call was made.

- Clean deterministic lint: Mars in Sagittarius, Mars in Aquarius, Mars in Pisces, Neptune in Aries.
- Reviewer warnings only: Pluto in Aquarius (`group chat`, `settles`), Chiron in Aries (`stacked-ending` shape), Nodes in Aquarius/Leo (`settling`).
- Total provider usage: 56,959 input tokens, 38,125 output tokens including 35,412 reasoning tokens, 95,084 total tokens.

Exact run metadata is in `writer-call-report.json`; each unit directory contains its unchanged writer response, deterministic checks, held fallback-row candidate, and result record.

The exact machine-readable readiness and run results are in `readiness.json` and `writer-call-report.json`.
