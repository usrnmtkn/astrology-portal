# Sky Placement coverage audit — 2026-09-06

Status: **READ-ONLY / NON-SERVING AUDIT**

Base main SHA: `1adc2d2bbf76c616f4cbcf83de833ba7ef4e72f2`

This audit answers one product question: **does every Sky Placement have an exact reader-ready base interpretation, and what still prevents a placement detail from feeling complete?**

It does not approve copy, change reader copy, alter serving state, mutate production data, or promote any draft.

## Finding

The primary Sky Placement base-copy problem is already solved. The remaining product gap is the event-specific aspect composition attached to each residency.

### Exact base placement coverage

The application exposes fourteen Sky bodies across twelve signs: 168 body/sign placement surfaces.

| Family | Exact sign-level reader unit | Count |
| --- | --- | ---: |
| Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron | `sky-placement/article/{planet}/{sign}` canonical continuous placement article | 120 |
| Moon | governed Moon sign-entry article | 12 |
| Lilith | `sky-lilith/article/{sign}` | 12 |
| North Node | `sky-nodes/north-node/{sign}` | 12 |
| South Node | `sky-nodes/south-node/{sign}` | 12 |
| **Total exact body/sign base units** |  | **168 / 168** |

The Node placement surface additionally composes the current exact Node axis (`sky-nodes/axis/{north-sign}-{south-sign}`); those 12 axis records are contextual composition, not additional body/sign denominator rows.

For the ten continuous families, current governance asserts all 120 canonical body/sign records are owner-approved, serving-enabled, LIVE, and retain the approved reader fields. Moon, Lilith, and Node surfaces use their separately governed exact families.

## What does not count as expanded placement coverage

The draft `TLDR-INGRESS-MADLIBS-TEMPLATE-V1` and its 83-hook fallback bank remain research only. Generic body, dignity, element, modality, motion, or universal hooks must not be counted as exact expanded Sky Placement coverage and must not mask an exact body/sign source gap.

PR #562's event-locked fallback-variant editor also remains non-serving infrastructure. Nothing in this audit promotes or populates it for reader use.

## Current aspect bottleneck

The existing app-level placement selector deliberately reduces the placement's current aspect candidates to one:

1. aspect must involve the placement body;
2. applying aspects rank first;
3. conjunctions rank next;
4. lower orb wins;
5. `.slice(0, 1)` keeps only one aspect.

That behavior is also protected by a regression test whose contract says the placement article prefers one applying conjunction, then the nearest applying major aspect.

The canonical SKY V4 resolver can already accept an aspect array and filters to governed approved aspects for the subject body. Therefore the bottleneck is upstream selection/composition, not the existence of an aspect section primitive.

## Coverage definition going forward

A **complete Sky Placement residency** should mean:

1. an exact governed body/sign base interpretation;
2. engine-owned entry and exit dates;
3. every qualifying exact aspect involving that placement body during the residency, in chronological order;
4. only aspect passages that resolve through the governed approved aspect authority;
5. unresolved aspect prose omitted rather than represented by an empty or invented card;
6. applicable governed conditionals only when their astronomical trigger is true (retrograde, station, seasonal context, Node/Lilith modules, etc.).

This definition separates **base content coverage** from **event-instance completeness**.

## Aspect-event authority

The engine is the authority for the residency window and exact aspect events. `getSkyPlacementTransitFacts(...)` already returns `rankedEventsDuringTransit` for non-structural placement bodies using the major aspect set. The existing authoring helper `scripts/build-sky-placement-engine-facts.mjs` currently trims that ranked list to the top two events after knowledge joining; that two-event authoring cap must not be mistaken for the complete residency event set.

A companion read-only script, `scripts/audit-sky-placement-residency-aspects.mjs`, prints the full engine-ranked residency aspect list, checks each event against `approvedExactSkyAspectCopy`, and can optionally assemble a non-serving canonical placement preview with every resolved aspect.

Sun-in-Scorpio audit:

```sh
node --import tsx scripts/audit-sky-placement-residency-aspects.mjs \
  --planet sun \
  --sign scorpio \
  --date 2026-11-01T12:00:00Z \
  --time-zone America/New_York
```

Add `--preview` to include the canonical placement page assembled with the full resolved aspect array. Add `--out <path>` only when a review artifact is intentionally wanted. Neither mode changes content or serving state.

## Pilot

`sun-scorpio-2026-target.md` defines the first product target:

- preserve the existing approved `sky-placement/article/sun/scorpio` base article;
- use the engine-owned October 23 to November 22, 2026 residency;
- enumerate the full Sun aspect sequence for that residency;
- resolve each event against the existing governed aspect authority;
- render resolved aspects chronologically beneath the placement content;
- do not generate replacement aspect prose for unresolved events.

## Explicitly out of scope

- rewriting any of the 168 exact base placement units;
- approving the 83 ingress hooks;
- changing approval ledgers;
- changing serving-release ledgers;
- production database writes;
- enabling the PR #562 fallback variant families;
- changing aspect wording;
- inferring owner approval from `reviewed`, lint, tests, or technical reachability.

## Next implementation wall

After the Sun-in-Scorpio pilot is reviewed, a separate implementation PR may replace the one-aspect selector with a residency-aware aspect sequence. That serving change requires its own regression coverage and owner review. This audit does not make that change.
