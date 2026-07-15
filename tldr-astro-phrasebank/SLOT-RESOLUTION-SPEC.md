# Slot resolution — how the mustache templates render

The templates (`cc-slot-templates.json`) and the authored library (`cc-vocab.json`,
`cc-authored-content.json`, `cc-fallback-hooks.json`) are two piles. `cc-slot-resolution-map.json`
is the bridge: for every one of the 235 template slots it says where the value comes from.

## The three slot kinds
- **fact** (40) — calculated astrology: `sign`, `body`, `house_ordinal`, dates, `orb_display`,
  `aspect_verb`, glyphs, timing. The resolver already has these from the chart/sky engine.
- **flag** (23) — a computed boolean for a mustache `{{#has_x}} / {{^has_x}}` section
  (`has_natal_house`, `is_retrograde`, ...). True/false from chart data or from whether an
  interpretive source resolved.
- **interpretive** (157) — an **authored record**. The map names the `(type, category)` and a
  `scope_from` that builds the lookup scope out of fact slots, so the resolver fetches exactly one
  authored row and drops its text in.

## Reading a map entry
```json
"collective_lived_scene": {
  "kind": "interpretive",
  "source": { "type": "vocab", "category": "planet-in-sign" },
  "scope_from": { "planet": "$body", "sign": "$sign" },
  "select": "scene",
  "fallback": "vocab/planet-vocab"
}
```
`$body`/`$sign` = the values of those fact slots. So for a Sun-in-Cancer card the resolver looks up
`vocab/planet-in-sign` where `scope.planet == "sun"` and `scope.sign == "cancer"`, and if absent falls
back to `vocab/planet-vocab` for the Sun.

`select` is the real extract operation, **audited from each source's actual shape** (not assumed):
- **one_of** — the scope has several rows (variants like `daily-action` alt1..4, or several
  `planet-in-sign` lines); pick one, and don't repeat the same lane on consecutive records.
- **clause** — the scope has one row whose body is a `;`-joined list (e.g. `lived-behaviors`:
  "sits on bold ideas; tries to do it all alone; hides away when overwhelmed"); split on `;` and pick one clause.
- **text** — the scope has one row; use the whole body (e.g. `transit/planet-through-house`, `aspect-pair`).

`hint` is my authoring label (scene/tension/dynamic/…) for a future pass that splits blobs into named
sub-parts; the resolver ignores it and uses `select`.

## Worked example — template 6B, today's Sun in Cancer
| slot | kind | resolves to |
|---|---|---|
| `body`, `sign`, `start_date_display`, `end_date_display` | fact | Sun, Cancer, Jun 21, Jul 22 |
| `collective_lived_scene` | interp | `vocab/planet-in-sign` (sun+cancer), scene |
| `body_sign_dynamic_in_same_scene` | interp | `vocab/planet-in-sign` (sun+cancer), dynamic |
| `has_collective_response` | flag | true if a `collective_response` resolved |
| `collective_response` | interp | `action/daily-action` (cancer), one_of |

The card assembles from the authored Sun-in-Cancer planet-in-sign row plus a Cancer daily-action,
poured into the 6B template — real voice, correct grammar, no raw `{{slots}}`.

## Resolver contract
1. For each slot in the template, read `resolution[slot]` (or `template_overrides["{tid}::{slot}"]`).
2. fact -> chart engine. flag -> compute boolean. interp -> build scope from `scope_from`, fetch the
   authored row by `(type, category, scope)`, apply `select`, then `fallback` if the row is missing.
3. If an interpretive slot and its fallback both miss, return `SOURCE_GAP` for that surface (do not
   emit a partial card or a raw slot).
4. Never print an unresolved `{{...}}`.

## Known gaps (15 slots, no authored source yet)
The moon-phase scene/action slots (`new_beginning_scene`, `seed_action`, `culmination_scene`,
`outgrown_structure`, ...) have no dedicated authored category — the 2A–2H templates were authored
with fixed prose around them. Options: (a) resolve them from `phrase/phrase-function` generically,
or (b) I author a small moon-phase scene/action bank (8 phases x a few variants). Say which; until
then those templates should render their fixed prose and suppress the optional slot, or return
`SOURCE_GAP`.

## Coverage caveats (resolver falls back, then SOURCE_GAP)
- `vocab/planet-in-sign` covers 115 of 120 planet-sign combos; missing combos hit the fallback then
  `SOURCE_GAP`. Some planet-in-sign rows are timely (e.g. a seasonal Sun-in-sign essay) rather than
  evergreen; `one_of` may surface a dated line, so the editor/reviewer should prefer evergreen variants.
- `aspect-pair/aspect-pair` is 84 rows, not every planet-pair x aspect; uncovered pairs fall back.
- These are content-coverage gaps, not map errors — the map wiring itself is complete (0 slot gaps).

## Files
- `cc-slot-resolution-map.json` — the map (resolution + template_overrides + templates index).
- Built + validated by `tests/build_slot_resolution.py` (fails if any slot is unclassified or points
  at a `(type, category)` not present in the library).
