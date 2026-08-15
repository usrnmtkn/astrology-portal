# 2,368 owner-approved rows were silently dropped by the index builder

Found and **fixed** 2026-08-14, while reconciling a reported count discrepancy.

## Outcome

Delta attributable to this fix:

```
                 before    after
canonical objects 12,855   13,011   +156
source records    21,548   23,861   +2,313
unresolved             0        0
skipped                -       55
collisions             0        0
```

156 new `house-activation/<planet>/<house>` objects carrying 2,313 records.
Nothing removed, no collisions, no object changed its meaning.

Catalog totals have moved on since: the four-body promotion step 1 added South
Node house transits, so the live figures are **13,023 objects / 23,909
records**. The `+156 / +2,313` above remains the correct delta for this change.

**All new material lands as `doctrine-only`.** It can inform reasoning; it
cannot reach a reader until you grant a surface permission. Of the 2,313
records, 177 have a house the source actually stated and are marked
`usage: "primary"`. The other 2,136 have a computed house and are marked
`usage: "mechanism-reference"`, `framingAllowed: false` — a computed house is an
inference, and inference must never supply framing.

### The fix was initially inert, and the audit caught it

Indexing the rows was not enough to make them usable. The resolver extracts
prose only from field names listed in `TEXT_FIELDS`, and the V9 rows keep
theirs in `Experience`, which was not listed. So all 156 new objects — and, it
turned out, **every one of the 162 objects sourced only from `matrix-v9`,
including ones that predate this change** — resolved to an empty packet. No
error. The store had been contributing zero readable evidence all along, hidden
because most V9 objects are co-sourced from stores whose field names were
already recognised.

`Experience` is now in `TEXT_FIELDS`. Verified contained: that capitalised
column name appears in no store other than `matrix-v9` and `matrix-v9-delta`,
and the 60 Friends wave-1 packets gained zero records, so no existing writer's
evidence changed. `house-activation/chiron/1` now returns real text as
`mechanism-reference` with `framingAllowed: false`.

`scripts/test-catalog-reachability.mjs` now fails the build when any indexed
object yields no readable prose on any surface, against a shrink-only baseline
of 736 objects that are legitimately non-prose (citation indexes, licences).

55 rows are skipped with reasons recorded, not indexed: 12 the owner marked
non-substantive or `[EXCLUDE FROM FALLBACK]`, and 43 naming no single subject
(`Venus/Sun`, `Stellium (Mars, Jupiter…)`, a bare `Nodes` that is ambiguous
between north and south, or an empty house).

All eight suites pass: knowledge wiring, drift freeze, identifier coverage,
pre-call gate, evidence adapter, index `--check`, grammar lint, transit-house
generator.

## What happens

`scripts/build-knowledge-index.mjs` line 389-392 loads the V9 matrix:

```js
const p = path.join(repoRoot, "apps/web/public/content/knowledge-matrix-v9/v9-owner-approved-governance-labeled/knowledge-matrix-v9-owner-approved-rows.json");
const j = readJson(p);
const collection = Array.isArray(j) ? null : Object.keys(j ?? {}).find((key) => Array.isArray(j[key])) ?? null;
const rows = Array.isArray(j) ? j : (collection ? j[collection] : []);
```

`.find()` returns the **first** array key. That file holds two:

| array | rows | governance | four-body rows |
|---|---:|---|---:|
| `transit_meanings` | 1,117 | all `owner-approved` | 84 |
| `house_activations` | **2,368** | all `owner-approved` | **120** |

`transit_meanings` is first, so `house_activations` is never read. Confirmed
from the other end: every index object backed by `matrix-v9` cites
`locator.collection: "transit_meanings"`, and there are 189 of them. Zero come
from house activations.

**2,368 rows you approved have never reached the writing engine.** No error was
raised. The loader did exactly what it was written to do.

## Why the count discrepancy pointed here

The step 1 report treated 203 owner-approved four-body rows as an overstatement
and corrected it to 178. Neither number was the real story:

- the workbook holds 84 `TransitMeanings` + 120 `HouseActivations` = 204
- the repo file holds the same 204
- the **index** holds only the 84, because the second array is skipped

The workbook and the repo agree. The indexer is the lossy step. A count
mismatch between a source and an index is worth tracing to a cause rather than
resolving by picking the lower number.

## The fix is two parts, not one

1. **Read every array, not the first.** Iterate all array-valued keys and carry
   the key name through as `locator.collection` so provenance stays exact.

2. **Parse four-part keys.** The existing branch handles three-part keys
   (`chiron|aquarius|ingress` → placement-sign or transit-house). House
   activation keys have four parts:

   ```
   aquarius|chiron|aries|ingress
   rising  |planet|sign |event
   ```

   These need their own canonical shape. `house-activation/<planet>/<house>` is
   the obvious candidate — the rows carry an explicit `House` field and a
   `House source` field marking whether it was stated or derived — but that is a
   modelling decision, not a mechanical one, so it needs your call. Rows whose
   `House source` is not `stated` should probably be treated differently from
   those where it is.

## What was applied

Three changes, all in `scripts/build-knowledge-index.mjs`.

**1. Read every array, not the first.** Iterate all array-valued keys and carry
the key name through as `locator.collection`, so provenance stays exact.

**2. Assert nothing is dropped — as a baseline, not a self-comparison.**

The first version of this guard was dead code:

```js
if (rowsRead !== rowsPresent) throw new Error("MATRIX_V9_ROWS_DROPPED: …");
```

Both sides derive from the same `collections` array, so they can never
disagree. It would have sat in the build looking like protection while
guarding nothing — the same category of problem as the bug it was meant to
catch.

What actually needs guarding is a future edit that stops reading a collection.
So the collections are named and given a floor:

```js
const REQUIRED_COLLECTIONS = { transit_meanings: 1117, house_activations: 2368 };
```

Missing collection or a shrunken one throws. Verified by reintroducing the
original bug — restricting the loader to the first array — and confirming
`MATRIX_V9_COLLECTION_MISSING: 'house_activations' was not read` fires, then
restoring and confirming the index rebuilds clean.

A guard that has never been seen to fail has not been tested.

**3. Grade the house source.** Rows carry `House source: "stated" | "computed"`.
Only 179 of 2,368 are stated. Treating a computed house as equal to a stated one
would let an inference frame a card, which is the exact failure the licensing
architecture exists to prevent. Stated rows are `primary`; computed rows are
`mechanism-reference` with `framingAllowed: false`.

## A distinction worth keeping: skipped is not unresolved

The first version of this fix pushed the 55 excluded rows onto `unresolved`,
which took that counter from 0 to 55 and would have broken the zero-unresolved
invariant permanently.

`unresolved` means "this should have mapped and did not" — a defect worth
alarming on. A row the owner marked non-substantive, or one naming two bodies
at once, is a correct and understood exclusion. Merging the two would have made
the invariant useless, so `skipped` is now a separate list with a reason on
every entry.

## Checked: is the same bug anywhere else?

Every JSON file the indexer opens was scanned for more than one array-valued
key. Three hold multiple arrays. Only the V9 file was affected.

| File | Arrays | Verdict |
|---|---|---|
| V9 matrix rows | `transit_meanings` 1117, `house_activations` 2368 | **was the bug**, fixed |
| `friends-transit-scene-licenses-v3.json` | `licenses` 12, `ambiguityGuards` 9, `authoritySources` 1 | safe — reads `j.licenses` by name |
| `authored-placements.json` | `entries` 314, `houseDoctrine` 12, `sourceIds` 1 | safe — reads `j.entries` by name |

Both safe cases select their array explicitly rather than by position, and both
have tests asserting the separation is deliberate:
`test-authored-placements-schema-separation.mjs` checks all 12 `houseDoctrine`
records are kept out of `entries`, and the license guards are asserted by
`test-friends-transit-house-license-proposals-v2/v3.mjs`. Their unread arrays
are constraints and unapproved doctrine, not evidence that belongs in the
catalog. `houseDoctrine` is `ownerApproved: false` and correctly excluded.

So this was a single instance, not a pattern. The named-baseline guard is still
worth copying to other stores, but no other store is currently losing rows.
