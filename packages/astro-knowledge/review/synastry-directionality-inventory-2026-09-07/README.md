# Synastry Directionality Inventory

Date: 2026-09-07
Status: read-only inventory infrastructure
Serving changes authorized: **no**

## Purpose

Inventory the 483 governed serving synastry rows before any large-scale reverse-direction authoring begins.

The audit answers a narrower question than the existing `body_you` / `body_they` fields do. Those fields handle reader/holder grammar. They do **not** prove that both semantic planetary directions have been authored.

The editorial product question for the new Friends direction is:

> **What does {{Name}} bring out in me?**

This inventory preserves every currently governed serving row and records which rows are ready for a missing reverse candidate versus which rows still need a human direction decision.

## Run

```bash
node scripts/build-synastry-directionality-inventory.mjs
node scripts/test-synastry-directionality-inventory.mjs
```

The builder writes:

- `packages/astro-knowledge/review/synastry-directionality-inventory-2026-09-07/inventory.json`
- `packages/astro-knowledge/review/synastry-directionality-inventory-2026-09-07/SUMMARY.md`

The source corpus is never modified by the builder.

## Expected governed corpus

The current locked baseline is:

- 483 governed serving synastry rows
- 161 canonical unordered body pairs
- 161 `conjunction` rows
- 161 `hard` rows
- 161 `soft` rows
- 55 `exact-owner-approved`
- 110 `owner-approved-grouped`
- 318 `legacy-reviewed`

Count drift fails the default build so a corpus change cannot silently alter the scope of the editorial project.

## What the inventory may infer automatically

Only structural facts:

- current content key
- canonical body pair
- aspect family
- current reader tier / review status
- current `body_you` and `body_they` hashes
- whether the two body fields are byte-identical
- whether a distinct reversed canonical key happens to exist

These are evidence for review, not semantic conclusions.

## What the inventory may NOT infer automatically

It may not decide that:

- `body_you` means one planetary direction and `body_they` means the other
- byte-identical body fields mean the aspect is reciprocal
- a missing reversed canonical key is missing content
- every pair needs a second directional paragraph

Semantic direction is human-reviewed.

## Initial seeded decisions

The owner-positive Batch 1 packet supplies only five decisions:

| Content key | Existing semantic direction | Missing direction | Inventory action |
| --- | --- | --- | --- |
| `fallback-hook/synastry-pair/sun/mars/hard` | Mars → Sun | Sun → Mars | `AUTHOR_REVERSE` |
| `fallback-hook/synastry-pair/sun/mercury/hard` | Mercury → Sun | Sun → Mercury | `AUTHOR_REVERSE` |
| `fallback-hook/synastry-pair/venus/ascendant/soft` | Venus → Ascendant | Ascendant → Venus | `AUTHOR_REVERSE` |
| `fallback-hook/synastry-pair/neptune/midheaven/soft` | Neptune → Midheaven | Midheaven → Neptune | `AUTHOR_REVERSE` |
| `fallback-hook/synastry-pair/moon/south-node/soft` | unresolved shared/reciprocal candidate | none presumed | `NEEDS_DIRECTION_REVIEW` |

The Moon / South Node row intentionally remains unresolved. It is a control against inventing a reverse merely because the schema can hold one.

## Review states

During this inventory stage there are only two machine-emitted actions:

- `AUTHOR_REVERSE`: an owner-reviewed semantic arrow is known and a complementary direction is justified.
- `NEEDS_DIRECTION_REVIEW`: no semantic conclusion has been authorized yet.

`RECIPROCAL_NO_REVERSE` is reserved for a later human decision. The builder is prohibited from assigning it automatically.

## Authoring gate after classification

A row should move to `AUTHOR_REVERSE` only when the existing passage has a clear one-way mechanism and the opposite body-to-body direction would tell the reader something materially different.

A row should move to `RECIPROCAL_NO_REVERSE` only after human review concludes that a shared relationship description is more accurate and useful than manufacturing two directional versions.

Existing serving prose remains locked during both decisions. Reverse authoring is additive review work until a later, explicit serving authorization changes the application contract.
