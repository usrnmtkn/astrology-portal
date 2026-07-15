# Codex prompt — import the AUTHORED library (v5), replace the invented hooks/vocab

## What changed and why
The v2–v4 `cc-fallback-hooks.json` (41 rows) and `cc-vocab.json` (103 rows) were hand-written
placeholders. They were a mistake: the real authored library — `sources/tldr-astro-records.json`
(2,642 records) plus the mustache templates in `TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md` — had never
been packaged for import. v5 packages it. The four content files now carry authored text verbatim,
with full provenance in `source_snapshot` (contentType, category, scope, provenance, sourceFile,
sectionRef, lane).

## Files to import (all DRAFT, nothing LIVE)
- `cc-fallback-hooks.json` — 447 rows. type=hook (daily-hook + event-fallback-hook) and type=fallback
  (slot templates with `{slot}` placeholders). This **replaces** the 41 invented hooks now in Supabase.
- `cc-slot-templates.json` — 63 rows. The mustache templates (1A..6O) verbatim. `body` is the template;
  `sections.slots` lists every interpolation slot. These are the "longer" templates that render the
  surfaces; interpretive slots resolve from vocab/authored records, fact slots from calculated astrology.
- `cc-vocab.json` — 1,086 rows. Authored vocabulary (planet-in-sign, lived-behaviors, hook-moves,
  actions, closings, planet-vocab, career [70], plus 526 phrases). **Replaces** the 103 invented rows.
- `cc-authored-content.json` — 1,109 rows. Every remaining authored type (transit, lunation, synastry,
  house-theme, aspect-pair, timing, action, closing, modifier, event, table-row, structure, template),
  so nothing from the 2,642 is dropped.

## Import steps
1. Safety assert: no CONFIRMED / `ms-*` row is archived or overwritten (all of the above are REVIEWED/DRAFT).
2. Replace the invented rows: archive the 41 hook + 103 vocab rows imported in v3/v4 (they carry
   `prompt_version` = `fallback-hook-template-v1` / `vocab-v1` / `tagline-v1`), then insert the authored
   rows. Keys are the `cc/...` keys from `content_key`.
3. Map by `content_key` (the authored `cc/...` keys) and `event_type`. Use `source_snapshot.scope`
   (sign / family / house / tier) for placement, and `source_snapshot.category` for the sub-bucket.
4. Slot templates: register the 63 `slot-template/{id}` rows in the hook/template registry; wire their
   `sections.slots` to the resolver (fact slots from astrology, interpretive slots from vocab/authored).
5. Keep everything DRAFT. No serving change. Human signs DRAFT -> LIVE later.

## Open confirmations
- Confirm the target surface/mode/block_type per `event_type` (TYPE_MAP in `build_authored_library.py`
  is a first mapping; adjust to the registry if needed).
- The `content_key`+mode unique-index fix still applies before any surface needs feed/in_depth siblings.
