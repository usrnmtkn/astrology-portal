# TLDR Astro — final import (one file, one pass)

This supersedes every prior drop. Import **one file**: `tldr-astro-authored-library-COMPLETE.json`.
Nothing else needs to be synced.

**Current serving split (after the end-to-end deep dive): 1,803 LIVE / serving, 932 DRAFT.** Two
deep-dive fixes are baked in: (a) 30 legacy `{slot}` fallback templates (weekly/monthly/year-ahead
horoscope, cazimi, outer-planet-cycle) were demoted to DRAFT so they never serve raw braces — the app's
interpolation engine must fill them before they go LIVE; (b) the relationship floor (synastry/composite
authored rows) was promoted to LIVE so the Friends tab renders. See `AUDIT-REPORT.md` for the full pass.
Honor each row's `status`/`lane`; the exact per-bucket counts live in `meta` inside the file.

## What the file is
A single self-contained JSON:
- `meta` — version, posture, bucket + slot counts.
- `coverage_ledger` — what is grounded and where the honest content gaps are (below).
- `slot_resolution_map` — the full 235-slot map (fact / flag / interpretive), embedded.
- `rows` — all 2,735 content rows, each tagged with `_bucket`.

## Rows (2,735) — two serving states
Each row carries `status`, `lane`, `serving_floor`, `admin_editable`.

**Emergency floor — 1,218 rows `status: LIVE`, `lane: serving`, `serving_floor: true`.**
The fallback hooks + templates, the 63 slot templates, the fully-covered fill vocab
(planet-vocab, planet-lived, house-lived, daily-action, daily-closing, daily-hook, lived-behaviors,
aspect-vocab, midheaven, phrase-function, moon-phase) and the 334 universal guide-phrases. This is
the layer that guarantees every public surface renders. It **serves immediately** and **must stay
editable in admin** (`admin_editable: true`).

**Editorial — 1,517 rows `status: DRAFT`, `lane: review`.**
Bespoke per-sign horoscopes, lunations, synastry, career, etc. Admin-visible for read/edit; does not
serve until a human promotes it.

| bucket | rows | in floor (LIVE) |
|---|---:|---:|
| fallback | 447 | 447 |
| slot-template | 63 | 63 |
| vocab | 1,086 | 479 |
| authored-content | 1,109 | 199 |
| moon-phase | 30 | 30 |

Tiers: 2,721 `REVIEWED`, 14 `CONFIRMED` (Marie-verbatim quote/eclipse/axis lines — provenance only;
none are in the floor, so they import `DRAFT` and do not serve). Surfaces and `block_type` are already
app-legal (`block_type` ∈ {null, `fallback_template`}); no importer normalization needed. Original
surface/status/lane preserved in `source_snapshot`.

## Import steps
1. Load `rows` into `generated_interpretations`, honoring each row's `status`/`lane` (archive/replace
   prior authored + invented rows by `content_key`). Result: 1,218 LIVE/serving, 1,517 DRAFT/review.
2. Confirm the floor serves: serving predicate `status=LIVE AND lane=serving AND review_state IS NULL
   AND not blocking-flagged` selects the 1,218 floor rows.
3. Keep the floor **editable in admin** — editing a LIVE floor row must work (edit-in-place, then
   re-publish per your lifecycle). The editorial DRAFT rows are editable as usual.
4. Register the 63 `slot-template/*` rows and wire `slot_resolution_map` into the resolver.
5. Safety assert: never archive/overwrite a pre-existing `CONFIRMED`/`ms-*` LIVE row. No CONFIRMED
   row here is flipped LIVE.
6. Keep the `content_key` + mode sibling merge you already added.

## Whole-piece floor (the emergency fallback must read well)
Where Marie wrote a complete piece that reads well on its own, the floor serves that piece **whole**
rather than shredding it through a template. So the retrograde and ingress routes now `prefer: record`
in the bridge (serve the authored paragraph), with the mustache template only as the deeper fallback:
- `transit/retrograde` — 9 per-planet paragraphs (Mercury…Chiron), now LIVE/serving.
- `transit/ingress`, `event/mercury-rx-sign` (12), `event/mercury-rx-element` (4), `event-action/do-dont`
  — now LIVE/serving.
Timely/personalized bespoke content (seasonal `planet-in-sign` essays, per-rising lunations, per-sign
event horoscopes) stays DRAFT editorial — it should not serve year-round without review. For those
template-driven floor surfaces, the template must still read cleanly from keyword vocab.

## Runtime key bridge (fixes blank surfaces) — do NOT rename anything
A public surface goes blank when it still requests an old `fallback-hook/{route}` key while the content
now lives under `cc/...` / `slot-template/...`. **The fix is an alias, not a rename.** Do not rename any
content key: the resolution map and provenance all reference the `cc/...` and `slot-template/...` keys, so
renaming would break them.

`runtime_key_bridge.map` in this file maps each of the 41 old request keys to its new target:
- `template: [slot-template/...]` — render that mustache template, then resolve its slots via
  `slot_resolution_map`. Where several are listed, `select_by` names the calculated dimension that picks
  the variant (e.g. `you.natal-aspect` -> 5P/5Q/5R/5S by aspect).
- `record: "type/category ..."` — synastry/composite/relationship have no mustache template (madlibs is
  sections 1-6), so resolve directly from those authored record families.

Wire the runtime key builder to look up `runtime_key_bridge` for any old key, then serve the target.
The build validates every bridge target exists (0 missing), so a bridge entry can never point at a
template or record family that isn't in the library.

## Resolver contract (from the embedded map)
For each template slot: `fact` -> chart engine; `flag` -> compute boolean; `interpretive` -> build
scope from `scope_from`, fetch the authored row `(type, category, scope)`, apply `select`
(`one_of` / `clause` / `text`), then `fallback`, then `ultimate_fallback` (`phrase/guide-phrase`),
else `SOURCE_GAP`. Never print a raw `{{slot}}`. 0 wiring gaps: every slot resolves or degrades to
real copy.

## Coverage ledger (honest content gaps — Marie has not written these; not invented)
- `vocab/planet-in-sign`: personal-planet × sign is not exhaustive → missing combos degrade to
  `vocab/planet-vocab` (all 10 planets), then guide-phrase.
- `aspect-pair/aspect-pair`: 84 pairs, not every pair × aspect → degrade to `vocab/aspect-vocab`.
- `vocab/dignity`: 6 of 12 signs → degrade to `vocab/aspect-vocab` / dignity-tag.
These are content gaps, not wiring gaps. Filling them requires new Marie source, so they are left as
graceful fallbacks rather than invented copy.

## Parked (unchanged)
The 52 asteroid/points rows (Ceres/Pallas/Juno/Vesta) remain for the later calculated-body task.

## Provenance
Built + validated by `tests/build_all.sh` (17/17) + `tests/build_final_bundle.py` (fails on any
missing field, illegal surface/block_type, duplicate key, or non-DRAFT status). Source of truth:
`sources/tldr-astro-records.json` + `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md`.
