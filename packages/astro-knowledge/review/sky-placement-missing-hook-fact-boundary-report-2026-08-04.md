# Sky Placement missing-hook fact-boundary report

> Superseded by the explicit Decisions A-D approval recorded in `sky-placement-fact-boundary-signoff-approval-2026-08-04.json`. See `sky-placement-fact-boundary-signoff-application-2026-08-04.md` for the post-approval result and packet findings.

Date: 2026-08-04

Scope: the 28 units left after the Mercury in Pisces, Mars in Libra, and Uranus in Gemini pilots. This report audits fact boundaries only. It does not authorize writer calls, content import, serving, or wiring.

## Summary

| Primary repository state | Units |
|---|---:|
| `REVIEWED` | 1 |
| `DRAFT` | 25 |
| Missing fact boundary | 2 |
| Total | 28 |

No remaining unit is ready for a batch writer call today. The only `REVIEWED` unit, Jupiter in Leo, contains corrupted content and must be corrected before use.

## DRAFT and structurally complete: ready for owner fact review

These 19 records have the expected fact fields and no known hard defect from this audit. They still require owner review before their status can change from `DRAFT`.

### Mercury

- `mercury-aries`
- `mercury-taurus`
- `mercury-gemini`
- `mercury-cancer`
- `mercury-virgo`
- `mercury-scorpio`
- `mercury-sagittarius`
- `mercury-capricorn`
- `mercury-aquarius`

### Mars

- `mars-aries`
- `mars-taurus`
- `mars-gemini`
- `mars-cancer`
- `mars-virgo`
- `mars-scorpio`
- `mars-sagittarius`
- `mars-capricorn`
- `mars-aquarius`

### Slow mover

- `saturn-aries`

## DRAFT with a required line correction

These four boundaries are structurally present, but a known house-language rule would fail if the wording reached generated copy.

| Unit | Finding |
|---|---|
| `mercury-leo` | Uses `performance` without clearly limiting it to literal acting, music, presentation, or measurable job performance. Leo alone is not an exception to CF-002. |
| `mercury-libra` | Challenge contains `people-pleasing`; the Current Sky `people` ban applies. |
| `mars-leo` | Gift contains figurative `perform under pressure`; CF-002 requires literal performance context. |
| `mars-pisces` | Challenge contains `letting anger leak`; CF-018 identifies `leak` as an AI tell. |

## Defective fact boundaries

### Marked REVIEWED but unusable

| Unit | Finding |
|---|---|
| `jupiter-leo` | The gift reads `At work this reads as growth and expansion carried out with proud.` It is corrupted English and imports a work domain without support. Its `REVIEWED` status should not make it available to the writer until the fact text is replaced and checked. |

### DRAFT and requiring replacement

| Unit | Finding |
|---|---|
| `neptune-aries` | The TLDR is only `Neptune in Aries.` and the gift is corrupted: `At work this reads as imagination and idealism carried out with direct.` |
| `pluto-aquarius` | The TLDR is only `Pluto in Aquarius.` and the gift is corrupted: `At work this reads as power and the urge to transform carried out with independent.` |

### Missing

| Unit | Missing boundary |
|---|---|
| `chiron-aries` | `packages/astro-knowledge/data/placements/sign/chiron-aries.json` does not exist. |
| `nodes-aquarius-leo` | Both `north-node-aquarius.json` and `south-node-leo.json` are absent. The combined Nodes fallback cannot be fact-gated from the current placement bank. |

## Source inventory

The 28 units come from the owner review resources:

- `/Users/mprez/Downloads/Resources/TLDR-Sky-SignCopy-Mercury-AllSigns-V2-REVIEW.md`
- `/Users/mprez/Downloads/Resources/TLDR-Sky-SignCopy-Mars-AllSigns-V2-REVIEW.md`
- `/Users/mprez/Downloads/Resources/TLDR-Sky-SignCopy-SlowMovers-Current-V2-REVIEW.md`

The repository import manifest still marks all three source files `needs_review` and `imported: false`.

## Batch gate

Before selecting the first batch of seven:

1. Review and mark the chosen structurally complete fact boundaries `REVIEWED`.
2. Correct any selected line-level defect before changing status.
3. Replace the corrupted Jupiter, Neptune, and Pluto boundaries before use.
4. Add reviewed Chiron and Nodes fact boundaries if either unit enters a batch.
5. Compile each packet locally and require the packet self-lint to pass before authorizing a billed call.
