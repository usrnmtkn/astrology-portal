# Sky Placement fact-boundary sign-off application

Date: 2026-08-04

Approval source: `sky-placement-fact-boundary-signoff-approval-2026-08-04.json`

## Applied

- Decision A: 19 structurally complete rows are `REVIEWED`; Saturn in Aries now states that Saturn is in fall.
- Decision B: the four approved line corrections were applied and those rows are `REVIEWED`.
- Decision C: Jupiter in Leo, Neptune in Aries, and Pluto in Aquarius were replaced exactly and are `REVIEWED`.
- Decision D: Chiron in Aries, North Node in Aquarius, and South Node in Leo were added exactly and are `REVIEWED`.

This clears all 28 placement-level units represented by 29 sign-placement JSON rows.

## Proposed batch 1

All seven suggested units passed packet compilation and packet self-lint:

| Unit | Packet status | Billed calls |
|---|---|---:|
| `mercury-gemini` | ready for an owner-authorized writer call | 0 |
| `mercury-virgo` | ready for an owner-authorized writer call | 0 |
| `mars-aries` | ready for an owner-authorized writer call | 0 |
| `mars-scorpio` | ready for an owner-authorized writer call | 0 |
| `mars-capricorn` | ready for an owner-authorized writer call | 0 |
| `saturn-aries` | ready for an owner-authorized writer call | 0 |
| `jupiter-leo` | ready for an owner-authorized writer call | 0 |

Each preflight uses `writer:sky-placement`, `gpt-5.6-sol`, `xhigh`, six owner passages, the current owner reference, prompt version `sky-placement-writer-v10:cycle-word+placement-name+standalone-opening-v1`, and plans one writer call with no judge.

## Full 28-unit packet audit

Twenty-two of the 28 post-pilot units compile now. Six remain blocked by dependencies outside, or overlooked by, the approved placement-row text:

| Unit | Blocking source | Finding |
|---|---|---|
| `mercury-taurus` | `data/placements/sign/mercury-taurus.json` | The approved text contains `settle`, an active output-ban watch term. The packet self-lint fails on warnings as well as hard bans. |
| `mercury-scorpio` | `data/planetary/mercury.json` | The planetary sign-expression source contains `delve`, a hard AI-tell ban. |
| `mars-taurus` | `data/planetary/mars.json` | The planetary sign-expression source contains `journey`, an active coaching-register watch term. |
| `pluto-aquarius` | `data/modifiers/planet-cycle-facts.json` | The cycle variability note contains `engine`, which is banned from quotable packet text. |
| `chiron-aries` | planetary layer | The approved sign-placement row exists, but `data/planetary/chiron.json` does not; planet function and sign expression remain unavailable to the packet. |
| `nodes-aquarius-leo` | planetary layer | The two approved sign-placement rows exist, but the packet has no North Node or South Node planetary function/sign-expression files. |

These findings do not undo the exact placement-row approval. They prevent billed generation for the six named units until the separate source dependency is corrected and re-reviewed.

## Readiness result

- Placement-level units approved: 28 of 28.
- Post-pilot units passing current packet compilation: 22 of 28.
- Suggested first batch passing preflight: 7 of 7.
- Repository-wide writer-ready placements: 36.
- Billed calls made: 0.
- Content imported, served, wired, promoted, or made canonical: none.
