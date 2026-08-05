# Codex prompt — correction: blocked harvests must report harvest_mode null

Copy everything below the line into Codex. Completes the correction merged in PR #49; work on
`main`. No billed calls; metadata only. No generation behavior or gate changes.

---

PR #49 fixed the packet-level `scaleRule` for blocked packets, but the nested `warmthHarvest` object
still misreports its mode. `failedHarvest()` in
`packages/astro-knowledge/scripts/aspect-corpus-warmth-harvest.js` stamps
`harvest_mode: harvestMode(format)`, so a blocked full-card packet carries
`warmthHarvest.harvest_mode: "matched"` although no harvest ran.

## Fix

- In `failedHarvest()`, set `harvest_mode: null`. The values `matched`, `vocabulary_only`, and
  `none_found` remain reserved for harvests that actually ran.
- Check every consumer of `warmthHarvest.harvest_mode` (packet builder, generators, repairs, lints,
  judges, `.d.ts` types, schemas) and confirm each handles `null`; none should branch on `"matched"`
  before checking `generationAllowed` or `status`.

## Verify

- Extend the blocked-packet regression assertion: `warmthHarvest.harvest_mode === null` and
  `scaleRule.harvest_mode === null` on the same packet; `matched`, `vocabulary_only`, and
  `none_found` packets unchanged.
- Rebuild the three blocked Jupiter–Ascendant packets (conjunction, square, trine; surface
  `synastry-aspect`, format `full-card`) and confirm the nested mode is null while everything else
  is unchanged.
- Warmth-harvest regression suite, exact-aspect pipeline, full Current Sky aspect suite including
  cron entrypoint, and reader-facing content contract all pass.
- Counts unchanged: 198 harvested, 42 fail-closed, 117 matched / 108 none_found, 225 owner
  calibration entries.

Out of scope: fail-closed and none_found behavior, gates, reader copy, approvals, serving,
promotion.
