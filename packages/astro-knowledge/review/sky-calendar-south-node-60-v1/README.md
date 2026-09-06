# Sky Calendar South Node pole-specific authoring — V1

Date: 2026-09-06
Status: **needs owner review / no serving changes**

## Owner product decision

The lunar nodes remain one astronomical axis, but North Node and South Node are separate editorial subjects.

Geometry deduplication is correct: one exact node-axis contact should not become two independent astronomical timestamps. Editorial deduplication is not correct: the North Node and South Node can describe different meanings of that same event.

The product contract is therefore:

**one astronomical event → two possible pole-specific interpretations**

This supersedes the editorial conclusion in `sky-calendar-south-node-axis-audit-2026-09-06` that no separate South Node writing queue was needed. The prior audit remains correct about geometry and event identity only.

## Geometry contract

South Node is always 180° from North Node, so the five major geometries mirror exactly:

| South Node interpretation | Same event, North Node geometry |
| --- | --- |
| conjunction | opposition |
| sextile | trine |
| square | square |
| trine | sextile |
| opposition | conjunction |

There are 12 non-node counterpart bodies in this authoring set and five major aspects, for **60 South Node interpretations**.

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

## Semantic contract

North Node and South Node are not interchangeable.

North Node copy centers the developmental direction, emerging path, or what is being built toward. South Node copy centers the familiar pattern, default strategy, inherited competence, prior chapter, and what may need to be released or used more consciously.

A North Node passage may not be relabeled, reversed, or mechanically rewritten into South Node copy. The 60 candidates in `records/` were authored from the South Node primitive, the aspect operation, and the governed node-pair mechanism. Existing North Node reader prose was not used as draft input.

Mechanism sources:

- `packages/astro-knowledge/data/points/south-node.json`
- `packages/astro-knowledge/data/primitives/aspects.json`
- `packages/astro-knowledge/review/TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.md`

## Review wall

All 60 V1 passages are `needs_review` and `runtimeEligible:false`.

This branch does **not**:

- change the approved North Node corpus;
- create any `*-south-node.json` runtime transit records;
- change Calendar event calculation or timestamps;
- change reader routing;
- mark any South Node passage approved;
- publish any South Node copy.

Owner review is required before a serving PR. After approval, the release implementation should keep a single astronomical node-axis event while making both pole-specific interpretations addressable by the content/UI layer.

## What the eventual serving model should preserve

For a square, both pole interpretations share the same aspect name and exact time, but may carry different copy. For conjunction/opposition and sextile/trine, the same event carries mirrored aspect names across the two poles.

Example data shape, not yet a runtime schema:

```text
nodeAxisEvent
  northNode: { aspect, contentKey }
  southNode: { mirroredAspect, contentKey }
  exactAt: one timestamp
```

The event is deduplicated. The meaning is not.
