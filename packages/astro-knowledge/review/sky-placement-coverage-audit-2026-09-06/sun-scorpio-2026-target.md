# Sun in Scorpio 2026 — complete-residency aspect target

Status: **NON-SERVING PRODUCT TARGET / NO NEW READER PROSE**

Base main SHA: `1adc2d2bbf76c616f4cbcf83de833ba7ef4e72f2`

## Base placement authority

Preserve the currently approved serving continuous-placement key:

`sky-placement/article/sun/scorpio`

This pilot does not rewrite, split, reapprove, or replace its `placementArticle`, TLDR, or legacy fallback fields.

## Engine-owned residency

Source: `packages/astro-knowledge/review/sky-placement-writer-sun-venus-24-2026-08-04/sun-scorpio/engine-facts.json`

- Sun enters Scorpio: **October 23, 2026** (America/New_York rendering)
- Sun exits Scorpio: **November 22, 2026**
- Engine ISO start: `2026-10-23T09:37:56.999Z`
- Engine ISO end: `2026-11-22T07:23:20.999Z`

The existing authoring facts file contains only two `eventsDuringTransit` records because `scripts/build-sky-placement-engine-facts.mjs` explicitly applies `.slice(0, 2)` after joining ranked engine events to meaning sources. It is therefore not a complete-residency aspect inventory.

## Complete major-aspect sequence to verify through the engine

The companion audit script must be the implementation authority for this list. An independent Swiss Ephemeris cross-check against the engine's ingress boundaries identifies the following five major exact Sun aspects inside the residency:

| Order | Approx. exact event | Geometry | Signs | Repo status before pilot |
| ---: | --- | --- | --- | --- |
| 1 | Oct. 24, 2026 | Sun conjunct Venus | Scorpio / Scorpio | engine confirmation required; governed aspect-copy resolution required |
| 2 | Oct. 26, 2026 | Sun square Pluto | Scorpio / Aquarius | already present in the existing engine-facts artifact; governed aspect-copy resolution required |
| 3 | Nov. 4, 2026 | Sun conjunct Mercury | Scorpio / Scorpio | engine confirmation required; governed aspect-copy resolution required |
| 4 | Nov. 18, 2026 | Sun square Jupiter | Scorpio / Leo | already present in the existing engine-facts artifact; governed aspect-copy resolution required |
| 5 | Nov. 19, 2026 | Sun square Mars | Scorpio / Leo | engine confirmation required; governed aspect-copy resolution required |

The independent cross-check is evidence, not serving authority. Do not hard-code these dates from this review document. Before implementation, run `getSkyPlacementTransitFacts(...)` through the audit script and use its full `rankedEventsDuringTransit` output.

## Aspect-copy gate

For each engine-confirmed event, resolve copy using the existing governed Sky aspect precedence/registry. The current content system exposes exact/sign/pair/placement-aspect families, but the presence of a generic or reviewed pair row is not equivalent to exact owner-approved wording for this placement event.

Required disposition for each event:

- `RESOLVED_APPROVED`: render the full governed aspect write-up;
- `UNRESOLVED`: omit the write-up from the reader page and report the coverage gap;
- never synthesize a replacement gloss merely to make the section look complete;
- never render an empty heading/card for an unresolved event.

The existing reviewed group-level `fallback-hook/sky-aspect-pair/sun/venus/conjunction` is useful fallback evidence, but its `reviewed` state alone must not be described as exact owner wording approval.

## Target reader composition

This document specifies ordering only. It does not author copy.

1. engine-owned placement headline and date range;
2. existing approved `sky-placement/article/sun/scorpio` reader content and any already-governed applicable conditionals;
3. one visible aspect section;
4. engine-confirmed exact aspects involving the Sun during this Scorpio residency, ordered by exact date;
5. for each aspect: engine date + factual aspect title + full governed approved write-up;
6. unresolved events omitted from reader prose but surfaced in the audit report.

The pilot should use the existing placement label **`Aspects shaping this transit`** unless the owner separately approves a reader-facing label change. A label change such as `Key aspects during Scorpio season` is editorial/product copy and is outside this audit.

## Acceptance conditions for a later implementation PR

- no change to the approved Sun-in-Scorpio base article bytes;
- no approval-ledger drift;
- no serving-release change unless separately authorized;
- all aspect dates come from the calculation engine;
- aspect list is residency-scoped, not current-orb-scoped;
- no arbitrary one-aspect cap;
- chronological stable ordering;
- no duplicate event IDs or duplicate aspect passages;
- only governed approved aspect prose renders;
- unresolved aspect copy fails closed without an empty reader card;
- archive/event-instance rendering is deterministic for the same calculated residency;
- current placement behavior outside the new aspect sequence does not drift.

## Why this pilot exists

The current placement UI intentionally selects a maximum of one aspect using applying/conjunction/orb priority. That behavior is useful for a compact current-state summary but is insufficient for the longer placement article if the product goal is complete content coverage across the whole residency.

The pilot tests a narrower change: **keep the exact base placement authority intact and make the event-specific aspect layer complete.**
