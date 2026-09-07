# Sky Calendar South Node pole-specific authoring — V1

Date: 2026-09-06
Status: **exact owner approved / serving outputs materialized / production merge pending**

## Owner product decision

The lunar nodes remain one astronomical axis, but North Node and South Node are separate editorial subjects.

Geometry deduplication is correct: one exact node-axis contact should not become two independent astronomical timestamps. Editorial deduplication is not correct: the North Node and South Node can describe different meanings of that same event.

The product contract is therefore:

**one astronomical event → two pole-specific interpretations**

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

## Owner approval

On 2026-09-06 the owner reviewed representative passages from the complete 60-record set and replied:

> these are great, approved

That statement grants **exact wording approval** to all 60 `summary` and `body` fields in the candidate set bound to commit `2005e620da8a98f8cbc2e1aa711f4cc127f5ddac` and the twelve record-file blob SHAs recorded in `owner-batch-authorization.json`.

The original record packets retain their `needs_review` and `runtimeEligible:false` fields as the immutable pre-approval snapshot. The separate authorization record is the approval evidence and binds the approved wording without rewriting the source packets after the decision.

The owner later authorized the serving implementation and Content Studio editing with:

> please proceed, and also make sure the south node content can be edited in the Content Studio

That implementation authorization is recorded separately in `owner-serving-authorization.json` so the original editorial approval remains immutable.

## Serving model

The serving release preserves the existing node-axis calculation and timestamp deduplication. The engine continues to emit one North-Node-keyed astronomical event. The content layer resolves the already-approved North Node interpretation and its mathematically mirrored South Node interpretation for that same event.

For a square, both interpretations carry `square`. For conjunction/opposition and sextile/trine, the South Node interpretation carries the mirrored aspect name.

The release materializes 60 exact South Node runtime content sources under `packages/astro-knowledge/data/transits/*-south-node.json`. Those files are **content records, not additional astronomical events**.

## Content Studio

Every LIVE exact South Node runtime source is mirrored into the existing Calendar Aspects Content Studio catalog as its own editable row. North Node and South Node retain separate content keys and explicit `nodeAxisPole` metadata, so editing one pole cannot overwrite or collapse the other.

Editable fields remain:

- Summary
- Body

As with the existing exact-aspect catalog, editing a published baseline forks a non-serving draft. An edit does not silently overwrite owner-approved serving copy; the normal explicit Sign Off and governed serving-release boundary remains in place.

## Invariants

The serving implementation must keep all of these true:

- one astronomical node-axis event and one exact timestamp;
- 60 canonical North Node event interpretations remain unchanged;
- 60 distinct South Node pole-specific interpretations remain byte-identical to the owner-approved candidate snapshot at release;
- no North Node prose is relabeled or mechanically reversed into South Node prose;
- North Node and South Node remain independently addressable in Content Studio;
- South Node content provenance points back to both the exact editorial approval and the separate serving authorization.
