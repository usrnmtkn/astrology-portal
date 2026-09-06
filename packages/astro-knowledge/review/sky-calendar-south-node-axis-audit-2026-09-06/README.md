# Sky Calendar South Node axis audit — 2026-09-06

Status: **governed coverage audit / no new serving copy**

## Result

The Sky Calendar major exact-aspect corpus does **not** need a second 60-card South Node reader corpus under the current canonical calculation contract.

The canonical Sky aspect profile defines South Node as the point 180° from North Node and deduplicates the lunar-node axis to one editorial event keyed to North Node. The engine calculates both geometric contacts, then retains the North Node contact as the canonical reader event.

That produces 60 South Node major-aspect geometries across the 12 non-node counterpart bodies and five major aspects, but those 60 geometries map one-to-one onto the 60 already owner-approved and serving North Node exact records.

## Major-aspect mirror

| South Node geometry | Canonical Calendar event |
| --- | --- |
| conjunction | North Node opposition |
| sextile | North Node trine |
| square | North Node square |
| trine | North Node sextile |
| opposition | North Node conjunction |

Counterpart bodies:

- Sun
- Moon
- Mercury
- Venus
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune
- Pluto
- Chiron
- Lilith

The North Node / South Node pair itself is not a reader event. The nodes are permanently opposite; node-axis-to-itself contacts are excluded by canonicalization.

## Reader-copy boundary

This audit does **not** say North Node and South Node have the same meaning.

Repository governance already establishes the opposite: North Node and South Node are opposite developmental poles. Axis derivation may establish geometry and event identity, but it must not be used to convert North Node prose into South Node prose.

The existing aspect authoring harness collapses both poles to the shared `nodes` pair source for axis-level mechanics. That source is sufficient for the current single canonical node-axis Calendar event. It is **not** authorization to create South Node reader copy by swapping labels or reversing North Node wording.

If the product later chooses to show North Node and South Node as separate simultaneous Calendar cards, that is a product-contract change. It requires:

1. an explicit owner decision to stop node-axis reader deduplication;
2. pole-specific South Node mechanism sources;
3. a distinct exact-copy review and approval set;
4. duplicate-event UX rules;
5. serving and routing changes with new regressions.

Until then, separate South Node exact transit files would be duplicate runtime content and should not exist.

## Permanent regression

`scripts/test-calendar-south-node-axis-mirror.mjs` proves:

- all 60 major South Node geometries are calculated before canonicalization;
- every geometry produces the correct mirrored North Node aspect;
- canonicalization leaves exactly one North Node-keyed editorial event;
- every mirrored event has an existing reader-eligible exact North Node runtime record;
- exactly 60 unique North Node runtime records cover the 60 South Node geometries;
- zero South Node exact runtime transit files exist.

The regression is part of the Ephemeris release gate so a future calculation or content change cannot silently split, duplicate, or lose the node-axis Calendar coverage.

## Scope

No reader copy changes. No owner approval changes. No serving changes. No database writes. No astrology calculation changes. No new South Node writing queue is created by this audit.
