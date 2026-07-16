#!/usr/bin/env bash
# Reproducible build of the whole reviewed bank, in order.
#   MS_PATH  = path to marie-source-phrases.json (for the CONFIRMED corpus)
#   MADLIBS  = path to TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md (for the harness)
#   SRC_DIR  = path to phrasebank sources/ (compatibility source + madlibs for builders)
#   VALIDATE_SRC_DIR = path to legacy cc + marie source banks for validate.py provenance
set -e
cd "$(dirname "$0")/.."

echo "1/4  building reviewed clauses…"
for b in build_aspect_reviews build_aspect_reviews_batch2 build_angle_reviews \
         build_outer_reviews build_outer_angle_reviews build_saturn_reviews \
         build_jupiter_reviews build_node_reviews build_chiron_reviews build_chiron_angle_reviews \
         build_planet_in_sign build_planet_in_house build_moon_reviews \
         build_natal_angle_reviews build_sky_events_reviews \
         build_synastry_reviews build_composite_reviews \
         build_sky_collective build_sky_historical \
         build_fast_gaps build_tails_reviews; do
  python3 "tests/$b.py" >/dev/null
done

echo "2/4  applying Marie tone pass + CHANI-quality transit revoice…"
python3 tests/tone_pass.py >/dev/null
python3 tests/build_transit_revoice.py >/dev/null

echo "3/4  extracting CONFIRMED corpus + attaching pull-quotes + Marie advice…"
python3 tests/build_confirmed_quotes.py
python3 tests/build_audit_replacements.py >/dev/null
python3 tests/build_compatibility_cards.py >/dev/null
python3 tests/build_compatibility_writeups.py >/dev/null
python3 tests/build_synastry_web_bundle.py >/dev/null
python3 tests/build_natal_source_grounded_bundle.py >/dev/null
python3 tests/build_ms_article_quotes.py >/dev/null
python3 tests/build_marie_site_templates.py >/dev/null
python3 tests/build_horoscope_templates.py >/dev/null
python3 tests/build_lunation_by_sign.py >/dev/null
python3 tests/build_lunation_authored.py >/dev/null
python3 tests/build_stelliums.py >/dev/null
python3 tests/build_empty_intercepted.py >/dev/null
python3 tests/build_natal_retrograde.py >/dev/null
python3 tests/build_ruler_sign_clauses.py >/dev/null
python3 tests/build_empty_house.py >/dev/null
python3 tests/build_transit_house.py >/dev/null
python3 tests/build_transit_activation.py >/dev/null
python3 tests/build_gap_surfaces.py >/dev/null
python3 tests/build_composite_typed.py >/dev/null
python3 tests/build_authored_library.py   # authored hooks + slot templates + vocab (replaces invented builders)
python3 tests/build_moon_phase_bank.py     # moon-phase scene/action fills (Marie lunation frame)
python3 tests/build_natal_angles.py        # 48 natal angle-in-sign readings
python3 tests/build_sky_points.py          # 48 sky-placement readings for points (Chiron/Lilith/Nodes)
python3 tests/build_placement_scaffold.py  # long-form natal placement scaffold (dignity/ruler-bridge/retro/sect)
python3 tests/build_slot_resolution.py     # slot -> source map that renders the mustache templates
python3 tests/build_final_bundle.py        # assemble ONE complete import file (rows + map + coverage)
python3 tests/normalize_sentences.py        # served reader fields -> standalone sentences (capital + period)
python3 tests/build_served_fields.py        # reader-facing field contract + internal blacklist
python3 tests/verify_fallback_render.py     # every emergency fallback renders clean (no empty/slot-leak/dup)
python3 tests/verify_rich_content.py        # reader-facing content clean (no slot/instruction leak, no dup sections)
python3 tests/build_ruling_planet_advice.py >/dev/null
python3 tests/build_ruling_planet_advice_drafts.py >/dev/null
python3 tests/attach_pullquotes.py
python3 tests/attach_marie_advice.py

echo "4/4  validating…"
python3 tests/render_harness.py 2>&1 | grep -E "renders:|placements|Chiron|RESULT"
python3 tests/render_sky_collective.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_lunation_authored.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_natal_surfaces.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_transit_house.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_transit_activation.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_gap_surfaces.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/render_composite_typed.py 2>&1 | grep -E "^RESULT|FAILURES"
python3 tests/test_pullquote_collisions.py 2>&1 | grep -E "^GATE|COVERAGE|avg active"
python3 tests/test_no_surfaced_dates.py
SRC_DIR="${VALIDATE_SRC_DIR:-$SRC_DIR}" python3 tests/validate.py
python3 tests/consolidate.py 2>&1 | tail -3
