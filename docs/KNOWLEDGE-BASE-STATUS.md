# Knowledge base and governed writing kernel — built; surface migration in progress

Date: 2026-08-14
Status: canonical evidence kernel complete and tested. The offline harness and
Friends runner consume it; production surfaces are not yet all migrated. No
approval or serving effect.

---

## What now exists

One knowledge base with one naming scheme and one governed resolver. Writers
that use the central kernel share this evidence contract while retaining
surface-specific writing strategies. Production still contains older consumers
that must be migrated per surface.

| | Before | After |
|---|---:|---:|
| Stores the writer could reach | 1 | 13 |
| Canonical objects | none | 12,855 |
| Indexed source records | none | 21,548 |
| Objects found in 2+ stores | invisible | 2,047 |
| Unresolved records | — | **0** |
| Collisions | — | **0** |
| Writer input, wave-1 average | 120 chars | **1,548 chars (12.9x)** |

### Three files

- `scripts/build-knowledge-index.mjs` — the catalog. Walks every store,
  resolves native keys to canonical ids, records a SHA-256 per source and a
  surface permission and authority class per record. Deterministic;
  `--check` fails when stale.
- `packages/astro-knowledge/scripts/knowledge-resolver.js` — the governed
  resolver. Builds a bounded, hashed evidence packet for a given object and
  surface. Throws rather than returning partial evidence.
- `scripts/test-knowledge-wiring.mjs` — 29 checks across the whole chain.

### Stores now indexed

| Store | Records |
|---|---:|
| serving layer (what readers see) | 7,425 |
| phrasebank | 7,064 |
| astro-knowledge/data | 2,943 |
| matrix V9 (CC 510 / AC 307 / ML 171 / OWN 129) | 1,117 |
| matrix V9 governance deltas | 1,033 |
| LL matrix V13 | 1,014 |
| authored placements (book-derived) | 314 |
| V13 owner-approved locked | 301 |
| AC reference index | 172 |
| Celestial Alchemy quote extract | 110 |
| As Above So Below extract | 12 |
| Friends scene licenses | 12 |
| Daily Glance governed event packets | 31 |

---

## The three rules the resolver enforces

**Temporality.** Every object declares whether it is a temporary window, a
lifelong pattern, or standing between two people. Natal material can inform a
transit card's mechanism but is labelled `MECHANISM REFERENCE ONLY` and can
never supply the framing. This is what stops a transit card from describing a
permanent trait.

**Authority, derived not copied.** `status` is not consulted. DRAFT files in
this repo have a higher median prose length than REVIEWED ones, and 980 of
1,401 DRAFT files exceed the median REVIEWED file. Authority is derived from
provenance: `owner-approved-prose`, `factual-evidence`, `voice-exemplar`,
`machine-proposal`, `unverified`. Only the first two may be offered as style.

**Surface isolation.** Every record carries a surface permission. A Friends
packet cannot contain synastry prose. Third-party material (Austin Coppock's
article index) is `doctrine-only` and never reaches a packet at all.

---

## Decisions made along the way

**`nonagen` merged into `semisextile`.** Every genuine aspect covers 97–100
planet pairs; semisextile covered 55 and nonagen 46, union 99 — exactly one
aspect's worth. V13's own entry reads *"The nonagen, or semisextile, is..."*
and the engine calculates neither. The 2 overlapping pairs are duplicates to
reconcile.

**Status labels are unreliable and must not gate anything.** Recorded in
`docs/decisions/2026-08-13-nonagen-and-status-reliability.md`.

**The Friends runner lost its private knowledge path.** `sourcePacket` no
longer reads a single hardcoded file; it calls `buildPacket` like every other
surface will.

---

## Test results — 29 of 29

Catalog determinism, aspect identity, authority model, surface isolation,
fail-closed behaviour, temporality labelling, no private knowledge path in the
runner, wave-1 coverage, and preservation of the billed ledger at 77 calls.

---

## Current boundary and open work

The knowledge-rich comparison and bounded register-correction continuation
have run. Richer evidence raised the observed ceiling but did not raise the
five-target average; deterministic register enforcement remains necessary.

Open items:

1. **Reconcile 2 duplicate semisextile entries** (`mars-neptune`, `mars-pluto`).
2. **7,064 phrasebank records classify as `unverified`** because their
   provenance is not yet expressed in a way the classifier reads. They resolve
   and are usable as meaning; they are simply not yet eligible as voice
   exemplars. Worth a pass.
3. **Status correction**, owner-led, starting with synastry.
4. **Production surface migration.** Sky and personalized transit identifiers
   now have deterministic total-coverage mappings and an opt-in shadow mode in
   `api/_lib/content-generation.ts`. Shadowing still sends the legacy prompt;
   each surface needs a seven-day evidence diff and explicit owner approval
   before promotion. Reports and arbitrary admin shapes remain fail-closed and
   unmapped.
5. **Surface voice policies.** Friends phrase retrieval is active. Every other
   surface remains owner-example-only until its reusable phrase corpus and
   cadence permissions are explicitly approved.
