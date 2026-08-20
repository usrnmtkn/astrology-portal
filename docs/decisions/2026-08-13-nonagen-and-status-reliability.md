# Two decisions: nonagen identity, and whether status can be trusted

Date: 2026-08-13
Both decided from data. Index rebuilt. Nothing served, nothing approved.

---

## Decision 1 — `nonagen` and `semisextile` are the same aspect. Merged.

This reverses the earlier "keep them separate" position, which was taken on
the grounds that the runtime type lists both.

### Evidence

**Coverage math is decisive.** V13 aspect pair coverage:

| Aspect | Pairs covered |
|---|---:|
| conjunction | 100 |
| sextile | 99 |
| square | 97 |
| trine | 97 |
| inconjunct | 97 |
| opposition | 97 |
| **semisextile** | **55** |
| **nonagen** | **46** |

Every genuine aspect covers 97–100 pairs. Semisextile and nonagen each cover
about half that. Their **union is 99** — exactly one aspect's worth — with an
overlap of only 2. Two real aspects would each need their own full pair set.
One aspect written under two spellings produces precisely this pattern.

**V13's own definition equates them.** The nonagen entry opens: *"The nonagen,
or semisextile, is a quiet snag that becomes obvious through repetition."*

**The two overlapping pairs are duplicates, not counter-evidence.**
`mars-neptune` and `mars-pluto` exist under both spellings with *different*
copy — two attempts at the same entry:

- nonagen: "A strong wish can be strangely hard to act on..."
- semisextile: "You can know exactly what you want and still have trouble
  taking the first practical step."

Same meaning, different wording. These need reconciling into one entry.

**The engine calculates neither.** `packages/astro-knowledge/engine/aspect-patterns/index.js`
computes only opposition (180), trine (120), square (90), sextile (60), and
quincunx (150). No chart ever produces a nonagen or a semisextile detection,
so nothing downstream depends on the distinction.

**Terminology.** A semisextile is the standard 30° aspect. "Nonagen" is not
standard usage; a novile/nonagon is 40° and belongs to a different tradition
that this corpus does not otherwise use.

### What changed

`nonagen -> semisextile` in the index aliases. Nonagen objects: 0.
Semisextile objects: 100 — matching the other aspects' coverage.

### Follow-ups for the owner

1. **Reconcile 2 duplicate entries** — `semisextile/mars/neptune` and
   `semisextile/mars/pluto` each carry two differing copy versions. Pick one.
2. **The runtime union type** in `fallbackArchitectureV3Runtime.ts` and
   `renderFallback.browser.ts` lists `nonagen` as a distinct member. It should
   become an accepted *input alias* that normalizes to semisextile, not a
   distinct output value. `normalizeAspect` currently maps
   `nonagen -> "nonagen"`; it should map `nonagen -> "semisextile"`.
3. **16 nonagen mentions remain in serving bundles.** They regenerate from
   source, so they resolve when the source and the normalizer agree.

---

## Decision 2 — `status` is not a reliable signal. Do not filter on it.

The owner's concern that "some of my material should have been approved" is
confirmed by the data.

### Evidence

Substantive prose per file, by status:

| Status | Files | Median chars | p90 | Near-empty |
|---|---:|---:|---:|---:|
| DRAFT | 1,401 | **625** | 1,309 | 29 |
| REVIEWED | 1,060 | **474** | 1,445 | 1 |
| LIVE | 227 | 990 | 1,169 | 0 |
| SOURCE_BACKED | 215 | 1,119 | 1,315 | 0 |

**DRAFT files are, on median, longer and more developed than REVIEWED files.**

**980 of 1,401 DRAFT files (69%) exceed the median REVIEWED file.** By folder:

| Folder | Rich DRAFT files |
|---|---:|
| synastry | 733 |
| points | 87 |
| pairs | 71 |
| modifiers | 34 |
| lunations | 24 |
| placements | 16 |

The 733 synastry files are the owner's confirmed work — weeks of writing,
carrying 316 unique tension passages and 315 unique advice passages with zero
repeated sentences between them.

### Conclusion

`status` records where a file sat in some past workflow, not whether the
content is finished. Filtering the resolver to approved-only would have
excluded roughly 980 substantial files, including the owner's own synastry
library.

### What this changes

- **The earlier "approved-only" recommendation is withdrawn.** It assumed the
  label meant something it does not.
- **For the bounded test batch:** resolve everything. Nothing serves; the
  point is to measure whether richer input improves cards.
- **For production:** the labels need correcting before any gate can rely on
  them. Until then, approval must attach to the *output copy* at owner review,
  which was always the rule, rather than being inferred from input status.
- **A status-correction pass belongs in the plan** ahead of any
  approval-gated automation. Start with synastry, where the mislabeling is
  known and the volume is largest.

### Related, still open

The authority model Codex asked for remains the right target: factual
evidence, owner-approved prose, voice exemplars, negative examples, and
proposals are different classes and a single `status` string cannot carry
them. That work should replace the status field rather than patch it.
