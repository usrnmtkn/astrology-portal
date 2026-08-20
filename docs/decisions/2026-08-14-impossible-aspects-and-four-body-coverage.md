# Impossible aspects removed, and what already exists for the four bodies

Date: 2026-08-14. Two findings, one code change, no serving or approval change.

## Part 1: aspects that cannot happen are no longer counted as gaps

New module `src/astro-writing/aspectPossibility.cjs`, wired into the coverage
enumeration. 130 identifiers removed from the audit. Catalog gaps fall from
3,286 to 3,216.

Two causes.

**Elongation limits.** Mercury and Venus orbit inside Earth, so from here they
never appear far from the Sun. Mercury reaches about 28 degrees, Venus about
47.8. A Sun-Mercury sextile needs 55 degrees at minimum orb, so it cannot
happen. Mercury and Venus can reach about 75.8 degrees apart, which permits a
sextile but not a square.

**Fixed axes.** The lunar nodes are the two crossings of the Moon's orbit. The
Ascendant and Descendant are the two ends of the horizon. The Midheaven and
Imum Coeli are the two ends of the meridian. Each pair is *defined* as 180
degrees apart, so within a chart they can form no aspect but the opposition.

### The correction I had to make to my own rule

My first version applied these limits everywhere. That was wrong, and the
catalog caught it: 167 existing objects were flagged impossible, which should
have been the tell. **The limits hold within one chart and say nothing across
two.** Transiting Sun square natal Sun happens twice a year. One person's
Mercury can sit anywhere relative to another person's Sun.

| kind | one chart? | limits |
|---|---|---|
| `natal-aspect` | yes | apply |
| `composite-aspect` | yes, derived | apply |
| sky / daily | yes, one moment | apply |
| `synastry-aspect` | no, two people | do not apply |
| `transit-aspect` | no, two moments | do not apply |

Composite needs its reasoning stated, since midpoints are not obviously well
behaved. Composite Sun is the midpoint of the two Suns and composite Mercury
the midpoint of the two Mercurys, so the composite elongation is the *average*
of the two charts' signed elongations. An average of values bounded by 28
degrees is bounded by 28 degrees, so the limit survives. The fixed axes survive
for the same reason: if South Node is North Node plus 180 in both charts, the
midpoints stay exactly 180 apart.

Scoping it correctly took the false positives from 167 to 11.

### 11 real errors found in the catalog

These composite objects name aspects that cannot occur in a composite chart.
All from the `phrasebank` store.

```
composite-aspect/mercury/sun/{opposition,sextile,square,trine}
composite-aspect/mercury/venus/{opposition,square,trine}
composite-aspect/sun/venus/{opposition,sextile,square,trine}
```

Doctrine written for configurations no reader can have. Worth deleting, but it
is owner-approved copy, so it needs your say-so rather than a quiet removal.
Note the shape of the error is consistent with someone generating a full
planet-by-aspect grid without the astronomy filter — the same mistake I made.

The catalog is otherwise correct on this, and impressively so: Mercury-Venus
sextile is present while Mercury-Venus square is absent. That is the exact
signature of someone who understood the constraint.

## Part 2: the four bodies are far better covered than the gap count suggests

The 3,216 remaining gaps are dominated by Nodes, Angles, Chiron and Lilith. But
substantial written material already exists for all four. The gap is largely
one of **indexing and promotion, not authorship.**

Already in the index for these four: **2,929 canonical objects, about 23% of the
whole catalog.**

### Nodes — strongest

- Published owner article, ~9,934 words, with 12 rising-sign horoscopes
  (`voice/.../owner-corpus/adjacent-formats/2025-2026-lunar-nodes-...md`)
- `TLDR-Article-Nodes-Aquarius-Leo-REVIEW.md`, ~2,744 words, bespoke edition
- `TLDR-Article-Template-Nodes-REVIEW.md`, reusable template
- `TLDR-Sky-Node-Axis-Exact-Aspects-V1.md`, ~8,251 words, aspect-level
- 24 `REVIEWED_CLAUSE` phrasebank entries (`cc-node-reviewed.json`)
- 60 owner-approved workbook rows in the V9 matrix
- Sign-off sheet states north-node-aquarius and south-node-leo are REVIEWED,
  gated only on `runtimeEligible: false`

### Chiron — strong

- `TLDR-Article-Edition-Chiron-Aries-REVIEW.md`, ~1,921 words
- Published retrograde article, ~1,813 words
- `TLDR-Sky-Chiron-Exact-Aspects-V1.md`, ~8,072 words
- 49 `REVIEWED_CLAUSE` phrasebank entries, plus 20 chiron-by-angle clauses
- 56 owner-approved workbook rows

### Angles — strongest structured, no article

- **296 `REVIEWED_CLAUSE` phrasebank entries**, the largest reviewed block of
  any of the four: 140 angle-pair, 60 outer-angle, 48 natal-angle, 48 authored,
  20 chiron-angle
- But: no TLDR article, no owner-approved workbook rows, and Descendant and IC
  have zero sign-level and zero natal-aspect index objects while Ascendant and
  Midheaven have 93 natal-aspect each. **The angle coverage is half an axis.**

### Lilith — good prose, weakest structure

- Complete V1 through V5 sign rewrite chain, owner-final at V5
- 78 exact-owner-approved lived-experience records
  (`review/lilith-78-lived-v2/`, `approvalLevel: "exact_owner_approved"`,
  approved 2026-08-10) — the most rigorously approved asset of the four
- 48 staged rows at `review_status: "approved"`
- `TLDR-Sky-Lilith-Exact-Aspects-V1.md`, ~8,600 words
- But only 2 owner-approved workbook rows, and **no dedicated phrasebank
  file** — Lilith is the only one of the four without one

### Shared across three

- `TLDR-Node-Chiron-Lilith-House-Transits-FINAL.md` — 48 units, all 12 houses
  for South Node, North Node, Chiron and Black Moon Lilith, plus a machine
  mirror at `node-chiron-lilith-house-transits-v1.json`
- `TLDR-PairSources-Import-chiron-lilith-nodes.json` — 32 pairs with
  `traditional` and `modern.blend` fields

## What this changes about the recommendation

I previously suggested restricting emission rather than authoring ~3,000
entries. Both were wrong framings. The real position:

1. **Much of it is already written and simply not promoted into the catalog.**
   The indexing and approval trail is the work, not the writing.
2. **The genuine authoring gaps are narrow and nameable:** a Lilith phrasebank
   file, Descendant and IC sign-level and natal-aspect coverage, and an angles
   article.
3. **Restrict emission only where nothing exists and nothing is planned** —
   composite Chiron-Lilith quincunx and similar.

Suggested order: promote what is approved, close the four named gaps, restrict
the remainder.

## Still open

- Owner call on deleting the 11 impossible composite phrasebank objects
- Owner call on the 24 unmapped shapes (`timing-profection-*`,
  `authored/transit-return/*`)
- The bounded Sky parity run, unauthorized and unexecuted
