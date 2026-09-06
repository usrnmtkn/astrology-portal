# Sky Calendar South Node axis audit — 2026-09-06

Status: **geometry audit retained / editorial conclusion superseded**

## Superseded editorial conclusion

Later on 2026-09-06, the owner clarified the product intent: North Node and South Node are separate interpretive subjects even when they describe the same astronomical node-axis contact.

The geometry findings in this audit remain correct. South Node is always 180° from North Node, the five major aspects mirror exactly, and the product should not create two independent astronomical timestamps for one node-axis event.

The earlier conclusion that the Calendar therefore needed **no separate 60-card South Node writing queue** is superseded. Geometry may be deduplicated; editorial meaning may not be collapsed automatically.

The current owner decision is:

**one astronomical event → two possible pole-specific interpretations**

South Node V1 authoring now lives in:

`packages/astro-knowledge/review/sky-calendar-south-node-60-v1/`

Those passages remain review-gated and runtime-ineligible until owner approval and a separate serving implementation.

## Original geometry result

The canonical Sky aspect profile defines South Node as the point 180° from North Node. The engine calculates both geometric contacts and currently canonicalizes them to one North-Node-keyed event.

That produces 60 South Node major-aspect geometries across the 12 non-node counterpart bodies and five major aspects. Each South Node geometry maps one-to-one to the corresponding North Node geometry at the same exact node-axis event.

## Major-aspect mirror

| South Node geometry | Same event, North Node geometry |
| --- | --- |
| conjunction | opposition |
| sextile | trine |
| square | square |
| trine | sextile |
| opposition | conjunction |

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

North Node and South Node do **not** have the same meaning.

Repository governance establishes them as opposite developmental poles. Axis derivation may establish geometry and event identity, but it must not be used to convert North Node prose into South Node prose.

The existing aspect authoring harness collapses both poles to the shared `nodes` pair source for axis-level mechanics. That source can establish the shared event mechanism. It is not authorization to create South Node reader copy by swapping labels, reversing sentences, or treating the North Node passage as the South Node draft source.

The owner has now explicitly chosen pole-specific editorial treatment. The 60 South Node passages therefore require their own mechanism-first authoring, review, and approval set.

## Permanent geometry regression

`scripts/test-calendar-south-node-axis-mirror.mjs` proves the current calculation contract:

- all 60 major South Node geometries are calculated before canonicalization;
- every geometry produces the correct mirrored North Node aspect;
- canonicalization currently leaves exactly one North-Node-keyed astronomical/editorial event;
- every mirrored event has an existing reader-eligible exact North Node runtime record;
- exactly 60 unique North Node runtime records cover the 60 geometries under the current serving implementation;
- zero South Node exact runtime transit files exist today.

Those assertions describe current runtime behavior, not the final editorial product contract. A future serving PR may need to evolve the canonical event payload so one deduplicated event can address both North Node and South Node copy without duplicating the timestamp.

## Scope of the original audit

The original audit made no reader copy, owner approval, database, or astrology calculation changes. Its geometry work remains valid. Its statement that no South Node writing queue was needed is historical and superseded by the owner decision above.
