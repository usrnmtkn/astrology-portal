#!/usr/bin/env python3
"""
build_slot_resolution.py — the slot -> source map that makes the mustache templates render.

Each mustache template (cc-slot-templates.json) has slots. This map tells the resolver, for
every slot, where its value comes from:
  - FACT  : calculated astrology (sign, body, dates, orb, aspect_verb, glyphs, timing) — no record.
  - FLAG  : a computed boolean (has_*, is_*) — true/false from chart/event data or source presence.
  - INTERP: an AUTHORED record. We name the (type, category) and how to build its scope from the
            template's fact slots, so the resolver looks up exactly one authored row.

Scope wiring: scope_from maps a source scope-dimension -> where its value comes from. e.g.
  planet-in-sign is scoped by {planet, sign}; scope_from={"planet":"$body","sign":"$sign"} means
  "look up vocab/planet-in-sign where scope.planet == the template's body and scope.sign == sign".
  "$x" = value of fact slot x; literals pass through.

Output: cc-slot-resolution-map.json (machine map for the resolver) + a coverage report. The build
FAILS if any slot is unclassified or any INTERP source (type,category) is absent from the library.
"""
import os, re, json
from collections import defaultdict

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PB  = os.path.join(PKG, "phrasebank")

# ---- FACT slots: resolved from calculated astrology, never from a record ----
FACT = {
 "sign","body","body_glyph","moon_sign","house_ordinal","natal_house_ordinal","natal_sign",
 "natal_point","transiting_point","point_a","point_b","aspect_verb","aspect_name","angle_name",
 "ruler_body","ruler_sign","ruler_house_ordinal","orb_display","timing_display","date_display",
 "start_date_display","end_date_display","exact_date_display","exact_time_display",
 "ingress_date_display","ingress_time_display","exit_date_display","shadow_exit_date_display",
 "shadow_degree_display","station_date_display","station_retrograde_date_display",
 "station_direct_date_display","station_degree_display","exact_degree_display","exact_time_compact",
 "event_date_display","event_date_compact","event_title","timezone_display","pass_context",
}
# ---- FLAG slots: computed booleans (mustache #/^ sections) ----
FLAG_PREFIX = ("has_", "is_")

# ---- INTERP slots -> (type, category, scope_from, select, fallback) ----
# scope_from values: "$factSlot" resolves to that slot; plain string is a literal scope value.
S = lambda **kw: kw
INTERP = {
 # 1. Home daily (sign-scoped scenes + actions)
 "editorial_headline":       ("hook","daily-hook", S(sign="$sign"), "one_of", None),
 "lived_scene":              ("vocab","lived-behaviors", S(sign="$sign"), "scene", "phrase/guide-phrase"),
 "felt_tension":             ("vocab","lived-behaviors", S(sign="$sign"), "tension", None),
 "habitual_response":        ("vocab","lived-behaviors", S(sign="$sign"), "response", None),
 "specific_cost":            ("vocab","lived-behaviors", S(sign="$sign"), "cost", None),
 "avoidance_pattern":        ("vocab","lived-behaviors", S(sign="$sign"), "response", None),
 "routine_scene":            ("vocab","lived-behaviors", S(sign="$sign"), "scene", None),
 "larger_commitment":        ("vocab","lived-behaviors", S(sign="$sign"), "scene", None),
 "stale_pattern":            ("vocab","lived-behaviors", S(sign="$sign"), "response", None),
 "unspoken_issue":           ("vocab","lived-behaviors", S(sign="$sign"), "tension", None),
 "secondary_conflict":       ("vocab","lived-behaviors", S(sign="$sign"), "tension", None),
 "specific_reset":           ("action","daily-action", S(sign="$sign"), "one_of", None),
 "clarifying_question_or_request": ("phrase","phrase-function", S(function="question"), "one_of", "action/daily-action"),
 "practical_action":         ("action","daily-action", S(sign="$sign"), "one_of", "phrase/phrase-function"),
 # 2I-2K Moon sign (scoped by moon_sign)
 "embodied_need":            ("vocab","lived-behaviors", S(sign="$moon_sign"), "tension", None),
 "ordinary_scene":           ("vocab","lived-behaviors", S(sign="$moon_sign"), "scene", None),
 "body_signal":              ("vocab","lived-behaviors", S(sign="$moon_sign"), "cost", None),
 "boundary_or_care_action":  ("action","daily-action", S(sign="$moon_sign"), "one_of", None),
 "short_permission":         ("closing","daily-closing", S(sign="$moon_sign"), "one_of", None),
 "compassionate_limit":      ("closing","daily-closing", S(sign="$moon_sign"), "one_of", None),
 "imperative_one":           ("action","daily-action", S(sign="$moon_sign"), "one_of", None),
 "imperative_two":           ("action","daily-action", S(sign="$moon_sign"), "one_of", None),
 "energy_protection_or_connection_permission": ("closing","daily-closing", S(sign="$moon_sign"), "one_of", None),
 # 3B-3E personalized planetary horoscope (planet+sign dynamic, house scene)
 "scene_claim":              ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "claim", None),
 "body_sign_dynamic":        ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "dynamic", None),
 "body_sign_dynamic_in_same_scene": ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "dynamic", None),
 "sign_style_lived":         ("vocab","lived-behaviors", S(sign="$sign"), "clause", None),  # sign character (natal-safe, not seasonal)
 "same_subject_development":  ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 "specific_house_scene":     ("house-theme","house-lived", S(house="$house_ordinal"), "scene", None),
 "one_house_scene":          ("house-theme","house-lived", S(house="$house_ordinal"), "scene", None),
 "one_private_house_scene":  ("house-theme","house-lived", S(house="$house_ordinal"), "scene", None),
 "likely_cost":              ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "cost", None),
 "central_question":         ("phrase","phrase-function", S(function="question"), "one_of", None),
 "second_question":          ("phrase","phrase-function", S(function="question"), "one_of", None),
 "reflective_question_one":  ("phrase","phrase-function", S(function="question"), "one_of", None),
 "reflective_question_two":  ("phrase","phrase-function", S(function="question"), "one_of", None),
 "observable_behavior":      ("vocab","lived-behaviors", S(sign="$sign"), "response", None),
 "compassionate_bridge":     ("phrase","guide-phrase", S(), "one_of", "phrase/pull-quote"),
 "lived_tension":            ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "tension", None),
 "understandable_response":  ("vocab","lived-behaviors", S(sign="$sign"), "response", None),
 "specific_pressure":        ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "tension", None),
 "developmental_task":       ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 "unhelpful_extreme":        ("vocab","lived-behaviors", S(sign="$sign"), "cost", None),
 # 4. Transits (planet-through-house scenes; aspect-pair function conflicts)
 "immediate_lived_scene":    ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", "aspect-pair/aspect-pair"),
 "recurring_lived_scene":    ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "recurring_opportunity_scene": ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "opportunity", None),
 "recurring_disruption_scene": ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "recurring_power_or_loss_scene": ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "uncertain_lived_scene":    ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "available_opening":        ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "opportunity", None),
 "angle_specific_scene":     ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "function_a_lived":         ("vocab","planet-lived", S(planet="$point_a"), "function", None),
 "function_b_lived":         ("vocab","planet-lived", S(planet="$point_b"), "function", None),
 "point_a_function_lived":   ("vocab","planet-lived", S(planet="$point_a"), "function", None),
 "point_b_function_lived":   ("vocab","planet-lived", S(planet="$point_b"), "function", None),
 "point_a_need":             ("vocab","planet-lived", S(planet="$point_a"), "need", None),
 "point_b_need":             ("vocab","planet-lived", S(planet="$point_b"), "need", None),
 "two_functions_becoming_entangled_scene": ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="$aspect_name"), "scene", None),
 "combined_function_scene":  ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="conjunction"), "scene", None),
 "supportive_lived_scene":   ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="$aspect_name"), "scene", None),
 "recurring_internal_conflict_scene": ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="square"), "scene", None),
 "polarity_scene":           ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="opposition"), "scene", None),
 "habitual_response_transit":("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
 "underuse_pattern":         ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
 "repeating_pattern":        ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
 "control_pattern":          ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
 "stability_pattern":        ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
 "trust_or_capacity_pattern":("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "development", None),
 "capacity_being_developed": ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "development", None),
 "emerging_need":            ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "development", None),
 "old_certainty":            ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "scene", None),
 "underlying_vulnerability": ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "tension", None),
 "pressure_meaning":         ("vocab","planet-lived", S(planet="$transiting_point"), "meaning", None),
 "liberating_meaning":       ("vocab","planet-lived", S(planet="$transiting_point"), "meaning", None),
 "discernment_meaning":      ("vocab","planet-lived", S(planet="$transiting_point"), "meaning", None),
 "transformational_meaning": ("vocab","planet-lived", S(planet="$transiting_point"), "meaning", None),
 "new_orientation":          ("vocab","planet-lived", S(planet="$transiting_point"), "meaning", None),
 "behavioral_consequence":   ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "cost", None),
 "deliberate_participation": ("action","daily-action", S(sign="$natal_sign"), "one_of", "phrase/phrase-function"),
 "proportionate_adjustment": ("action","daily-action", S(sign="$natal_sign"), "one_of", None),
 "concentration_action":     ("action","daily-action", S(sign="$natal_sign"), "one_of", None),
 "grounding_action":         ("action","daily-action", S(sign="$natal_sign"), "one_of", None),
 "bounded_experiment":       ("action","daily-action", S(sign="$natal_sign"), "one_of", None),
 "integration_direction":    ("phrase","guide-phrase", S(), "one_of", None),
 # 5. Natal (placement). NOTE: natal must NOT use vocab/planet-in-sign — that category is SEASONAL/
 # current-sky content ("Venus retrograde this year...") and leaks into a birth chart. Natal slots
 # resolve from planet-lived (planet function) + lived-behaviors (sign character), both natal-safe.
 "body_in_sign_lived_claim": ("vocab","planet-lived", S(planet="$body"), "one_of", "vocab/lived-behaviors"),
 "body_in_sign_lived_tension":("vocab","lived-behaviors", S(sign="$sign"), "clause", None),
 "body_function_lived":      ("vocab","planet-lived", S(planet="$body"), "function", None),
 "integrated_resource":      ("vocab","planet-lived", S(planet="$body"), "one_of", None),
 "developmental_direction":  ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 "underlying_need":          ("vocab","planet-lived", S(planet="$body"), "need", None),
 "relational_growth_edge":   ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 "relational_scene":         ("house-theme","house-lived", S(house="$house_ordinal"), "scene", None),
 "private_lived_process":    ("house-theme","house-lived", S(house="$house_ordinal"), "scene", None),
 "placement_core_paragraph": ("vocab","planet-lived", S(planet="$body"), "one_of", "vocab/lived-behaviors"),
 "capacity_direction":       ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 "lived_consequence":        ("vocab","planet-lived", S(planet="$point_a"), "meaning", None),
 "pole_a_behavior":          ("vocab","planet-lived", S(planet="$point_a"), "function", None),
 "pole_b_behavior":          ("vocab","planet-lived", S(planet="$point_b"), "function", None),
 "relational_or_internal_balance": ("phrase","guide-phrase", S(), "one_of", None),
 # sect / dignity / retrograde / ruler modifiers
 "mercury_sect_sentence":    ("vocab","mercury-archetype", S(planet="mercury"), "one_of", None),
 "sect_modifier_day":        ("vocab","dignity-tag", S(condition="sect"), "day", "vocab/dignity"),
 "sect_modifier_night":      ("vocab","dignity-tag", S(condition="sect"), "night", "vocab/dignity"),
 "dignity_lived_effect":     ("vocab","dignity", S(sign="$sign"), "one_of", "vocab/dignity-tag"),
 "dignity_paragraph":        ("vocab","dignity", S(sign="$sign"), "paragraph", None),
 "retrograde_internalization_scene": ("vocab","retrograde-phase", S(phase="natal"), "scene", "transit/retrograde"),
 "retrograde_revision_pattern": ("vocab","retrograde-phase", S(phase="natal"), "pattern", None),
 "retrograde_paragraph":     ("vocab","retrograde-phase", S(phase="natal"), "paragraph", None),
 "ruler_bridge_same_subject":("vocab","planet-in-house", S(planet="$ruler_body", house="$ruler_house_ordinal"), "one_of", "house-theme/house-lived"),
 "ruler_bridge_paragraph":   ("vocab","planet-in-house", S(planet="$ruler_body", house="$ruler_house_ordinal"), "paragraph", None),
 "supportive_aspect_scene":  ("aspect-pair","aspect-pair", S(planetA="$body", planetB="$point_b", aspect="$aspect_name"), "scene", "vocab/aspect-vocab"),
 "supportive_capacity":      ("vocab","aspect-vocab", S(aspect="$aspect_name"), "capacity", None),
 "supportive_aspects_paragraph": ("aspect-pair","aspect-pair", S(planetA="$body", planetB="$point_b", aspect="$aspect_name"), "paragraph", None),
 "challenging_aspect_scene": ("aspect-pair","aspect-pair", S(planetA="$body", planetB="$point_b", aspect="$aspect_name"), "scene", "vocab/aspect-vocab"),
 "challenging_aspects_paragraph": ("aspect-pair","aspect-pair", S(planetA="$body", planetB="$point_b", aspect="$aspect_name"), "paragraph", None),
 "integration_practice":     ("action","daily-action", S(sign="$sign"), "one_of", None),
 # angles
 "approach_pattern":         ("vocab","lived-behaviors", S(sign="$sign"), "clause", "house-theme/house-lived"),  # rising sign character (natal-safe)
 "first_impression_scene":   ("house-theme","house-lived", S(house="1"), "scene", None),
 "growth_edge":              ("house-theme","house-lived", S(house="1"), "development", None),
 "public_role_scene":        ("vocab","midheaven", S(sign="$sign"), "scene", "vocab/career"),
 "vocational_pattern":       ("vocab","midheaven", S(sign="$sign"), "pattern", "vocab/career"),
 "partnership_scene":        ("house-theme","house-lived", S(house="7"), "scene", None),
 "projected_or_sought_quality": ("house-theme","house-lived", S(house="7"), "development", None),
 "relational_quality":       ("house-theme","house-lived", S(house="7"), "scene", None),
 "private_foundation_scene": ("house-theme","house-lived", S(house="4"), "scene", None),
 "restorative_or_boundary_direction": ("house-theme","house-lived", S(house="4"), "development", None),
 "root_pattern":             ("house-theme","house-lived", S(house="4"), "scene", None),
 # 6. Sky (collective planet-in-sign; aspect-pair; retrograde; ingress; event)
 "compact_collective_claim": ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "claim", None),
 "collective_lived_scene":   ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "scene", "vocab/planet-vocab"),
 "collective_response":      ("action","daily-action", S(sign="$sign"), "one_of", "phrase/guide-phrase"),
 "shared_priority_or_pressure_scene": ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "scene", None),
 "body_sign_dynamic_in_same_subject": ("vocab","planet-in-sign", S(planet="$body", sign="$sign"), "dynamic", None),
 "observable_collective_pattern": ("vocab","planet-lived", S(planet="$body"), "meaning", None),
 "collective_structure_or_assumption": ("vocab","planet-vocab", S(planet="$body"), "one_of", None),
 "slow_collective_development": ("vocab","planet-lived", S(planet="$body"), "meaning", None),
 "collective_friction_scene": ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="$aspect_name"), "scene", None),
 "two_functions_conflict":   ("vocab","aspect-vocab", S(aspect="$aspect_name"), "conflict", None),
 "proportionate_collective_response": ("action","daily-action", S(sign="$sign"), "one_of", "phrase/guide-phrase"),
 "collective_opening_scene": ("aspect-pair","aspect-pair", S(planetA="$point_a", planetB="$point_b", aspect="$aspect_name"), "scene", None),
 "cooperative_function":     ("vocab","aspect-vocab", S(aspect="$aspect_name"), "capacity", None),
 "deliberate_collective_use":("action","daily-action", S(sign="$sign"), "one_of", None),
 # retrograde passage family
 "early_recurrence_scene":   ("transit","retrograde", S(planet="$body", motion="retrograde"), "scene", "fallback/fallback"),
 "affected_process":         ("vocab","planet-lived", S(planet="$body"), "function", None),
 "station_lived_scene":      ("transit","retrograde", S(planet="$body", motion="station"), "scene", None),
 "premature_next_step":      ("action","daily-action", S(sign="$sign"), "one_of", None),
 "review_scene":             ("transit","retrograde", S(planet="$body", motion="retrograde"), "scene", None),
 "specific_material":        ("vocab","planet-lived", S(planet="$body"), "function", None),
 "review_subject":           ("vocab","planet-lived", S(planet="$body"), "function", None),
 "next_decision":            ("action","daily-action", S(sign="$sign"), "one_of", None),
 "reviewed_process":         ("vocab","planet-lived", S(planet="$body"), "function", None),
 "integration_scene":        ("transit","retrograde", S(planet="$body", motion="direct"), "scene", None),
 "specific_follow_through":  ("action","daily-action", S(sign="$sign"), "one_of", None),
 # ingress
 "collective_focus_shift":   ("transit","ingress", S(planet="$body"), "one_of", "vocab/planet-in-sign"),
 # events
 "event_lived_meaning":      ("event-horoscope","collective-event", S(event="$event_title"), "one_of", "event/mercury-rx-sign"),
 "event_response":           ("event-action","do-dont", S(event="$event_title"), "one_of", "action/daily-action"),
 "technical_event_sentence": ("timing","timing", S(topic="$event_title"), "one_of", None),
 # paragraph assemblers (5K full composition references other paragraph slots)
 "challenging_aspects_paragraph_ref": ("aspect-pair","aspect-pair", S(), "paragraph", None),
 "sect_paragraph":           ("vocab","dignity-tag", S(condition="sect"), "paragraph", "vocab/dignity"),
 # transit activation + relationship-subject continuity
 "activation_condition":     ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "development", None),
 "same_relationship_subject":("house-theme","house-lived", S(house="7"), "development", "synastry/synastry-core"),
}

# Per-template overrides where a shared slot name means a different source in that template.
OVERRIDE = {
 ("6M","same_subject_development"): ("transit","ingress", S(planet="$body"), "one_of", "vocab/planet-in-sign"),
 ("3B","same_subject_development"): ("house-theme","house-lived", S(house="$house_ordinal"), "development", None),
 ("4A","habitual_response"): ("transit","planet-through-house", S(planet="$transiting_point", house="$natal_house_ordinal"), "response", None),
}

# ---- MOON-PHASE slots: now filled by cc-moon-phase-bank.json (Marie's lunation frame) ----
GAP_SLOTS = set()
MP = lambda phase, role: ("vocab", "moon-phase", {"phase": phase, "role": role}, "one_of", None)
INTERP.update({
 "new_beginning_scene":       MP("new-moon","scene"),
 "seed_action":               MP("new-moon","action"),
 "early_effort":              MP("waxing-crescent","scene"),
 "small_building_action":     MP("waxing-crescent","action"),
 "decision_scene":            MP("first-quarter","scene"),
 "decisive_action":           MP("first-quarter","action"),
 "developing_effort":         MP("waxing-gibbous","scene"),
 "refinement_action":         MP("waxing-gibbous","action"),
 "culmination_scene":         MP("full-moon","scene"),
 "clear_result":              MP("full-moon","result"),
 "lesson_or_result":          MP("waning-gibbous","result"),
 "outgrown_structure":        MP("last-quarter","scene"),
 "release_or_revision_action":MP("last-quarter","action"),
 "ending_scene":              MP("balsamic","scene"),
 "outgrown_pattern":          MP("balsamic","result"),
})

# Real resolver operation per source shape (audited against the records, not assumed):
#   one_of = pick one row/variant among the scope's rows
#   clause = the scope has one row; split its body on ';' and pick one clause
#   text   = the scope has one row; use the whole body
SHAPE_OP = {
 ("action","daily-action"):"one_of", ("closing","daily-closing"):"one_of",
 ("hook","daily-hook"):"one_of", ("house-theme","house-lived"):"one_of",
 ("phrase","guide-phrase"):"one_of", ("phrase","phrase-function"):"one_of",
 ("timing","timing"):"one_of", ("vocab","mercury-archetype"):"one_of",
 ("vocab","moon-phase"):"one_of", ("vocab","planet-in-sign"):"one_of",
 ("vocab","planet-lived"):"one_of",
 ("event-action","do-dont"):"clause", ("vocab","aspect-vocab"):"clause",
 ("vocab","dignity"):"clause", ("vocab","lived-behaviors"):"clause",
 ("vocab","planet-in-house"):"clause", ("vocab","planet-vocab"):"clause",
 ("aspect-pair","aspect-pair"):"text", ("event-horoscope","collective-event"):"text",
 ("transit","ingress"):"text", ("transit","planet-through-house"):"text",
 ("transit","retrograde"):"text", ("vocab","dignity-tag"):"text",
 ("vocab","midheaven"):"text", ("vocab","retrograde-phase"):"text",
}

# Sources with full domain coverage -> safe as fallbacks (audited above).
FULLY_COVERED = {
 ("vocab","planet-vocab"),("vocab","planet-lived"),("house-theme","house-lived"),
 ("action","daily-action"),("closing","daily-closing"),("hook","daily-hook"),
 ("vocab","lived-behaviors"),("phrase","guide-phrase"),("vocab","aspect-vocab"),
 ("vocab","midheaven"),("phrase","phrase-function"),("vocab","moon-phase"),
}
# Sources with partial coverage -> a request may miss; must chain to a covered fallback.
GAPPY = {
 ("vocab","planet-in-sign"),("aspect-pair","aspect-pair"),("vocab","dignity"),
 ("vocab","planet-in-house"),("vocab","mercury-archetype"),("vocab","dignity-tag"),
 ("vocab","retrograde-phase"),("transit","ingress"),("transit","retrograde"),
 ("transit","planet-through-house"),("event-horoscope","collective-event"),("timing","timing"),
}
# Guaranteed-covered fallback per gappy source family; ultimate net is guide-phrase.
SAFE_FALLBACK = {
 ("vocab","planet-in-sign"):"vocab/planet-vocab",
 ("aspect-pair","aspect-pair"):"vocab/aspect-vocab",
 ("vocab","dignity"):"vocab/aspect-vocab",
 ("vocab","planet-in-house"):"house-theme/house-lived",
 ("vocab","mercury-archetype"):"vocab/planet-lived",
 ("transit","ingress"):"vocab/planet-vocab",
 ("transit","retrograde"):"vocab/planet-lived",
 ("transit","planet-through-house"):"house-theme/house-lived",
 ("event-horoscope","collective-event"):"phrase/guide-phrase",
}
ULTIMATE_FALLBACK = "phrase/guide-phrase"

def safe_fallback_for(typ, cat, hand_fb):
    """Guarantee a resolvable fallback: keep a covered hand fallback, else pick a safe one."""
    if hand_fb:
        ht, hc = hand_fb.split("/", 1)
        if (ht, hc) in FULLY_COVERED:
            return hand_fb
    if (typ, cat) in GAPPY:
        return SAFE_FALLBACK.get((typ, cat), ULTIMATE_FALLBACK)
    return hand_fb  # primary is fully covered; original fallback (may be None) is fine

def load_categories():
    cats = set()
    for f in ("cc-vocab","cc-authored-content","cc-fallback-hooks","cc-moon-phase-bank"):
        for r in json.load(open(os.path.join(PB, f+".json")))["reviewed"]:
            ss = r["source_snapshot"]
            cats.add((ss.get("contentType"), ss.get("category")))
    return cats

def main():
    templates = json.load(open(os.path.join(PB,"cc-slot-templates.json")))["reviewed"]
    cats = load_categories()

    all_slots = set()
    per_template = {}
    for t in templates:
        tid = t["source_snapshot"]["templateId"]
        per_template[tid] = t["sections"]["slots"]
        all_slots.update(t["sections"]["slots"])

    def classify(slot):
        if slot in FACT: return ("fact", None)
        if slot.startswith(FLAG_PREFIX): return ("flag", None)
        if slot in GAP_SLOTS: return ("gap", None)
        if slot in INTERP: return ("interp", INTERP[slot])
        return ("unmapped", None)

    # validate: no unmapped, every interp source exists
    unmapped, bad_source = [], []
    for slot in sorted(all_slots):
        kind, spec = classify(slot)
        if kind == "unmapped": unmapped.append(slot)
        if kind == "interp":
            typ, cat = spec[0], spec[1]
            if (typ, cat) not in cats: bad_source.append((slot, typ, cat))
            if (typ, cat) not in SHAPE_OP: bad_source.append((slot+" [no shape_op]", typ, cat))
    for (tid, slot), spec in OVERRIDE.items():
        if (spec[0], spec[1]) not in cats: bad_source.append((f"{tid}:{slot}", spec[0], spec[1]))

    # build the map
    def spec_json(spec):
        typ, cat, scope_from, hint, fb = spec
        op = SHAPE_OP.get((typ, cat), "text")  # real resolver op, audited from record shape
        eff_fb = safe_fallback_for(typ, cat, fb)  # guaranteed-resolvable fallback
        return {"source": {"type": typ, "category": cat}, "scope_from": scope_from,
                "select": op, "hint": hint, "fallback": eff_fb,
                "coverage": ("partial" if (typ, cat) in GAPPY else "full"),
                "ultimate_fallback": ULTIMATE_FALLBACK}
    resolution = {}
    for slot in sorted(all_slots):
        kind, spec = classify(slot)
        if kind == "interp": resolution[slot] = {"kind":"interpretive", **spec_json(spec)}
        elif kind == "fact": resolution[slot] = {"kind":"fact","source":"calculated_astrology"}
        elif kind == "flag": resolution[slot] = {"kind":"flag","source":"computed_boolean"}
        elif kind == "gap":  resolution[slot] = {"kind":"gap","source":None,
                              "note":"no authored category yet; author moon-phase scene/action bank or resolve from phrase/phrase-function"}
    overrides = {f"{tid}::{slot}": {"kind":"interpretive", **spec_json(spec)} for (tid,slot),spec in OVERRIDE.items()}

    out = {
      "version":"slot-resolution-v1",
      "note":"Maps every template slot to its source. fact=calculated astrology; flag=computed boolean; "
             "interpretive=authored record (type+category) with scope_from wiring; gap=needs authoring. "
             "scope_from '$x' means the value of fact-slot x; literals pass through. select is the pick "
             "rule inside the resolved record (e.g. one_of a variant list, or a named field/sentence).",
      "counts":{"slots":len(all_slots),
                "interpretive":sum(1 for v in resolution.values() if v["kind"]=="interpretive"),
                "fact":sum(1 for v in resolution.values() if v["kind"]=="fact"),
                "flag":sum(1 for v in resolution.values() if v["kind"]=="flag"),
                "gap":sum(1 for v in resolution.values() if v["kind"]=="gap")},
      "resolution":resolution,
      "template_overrides":overrides,
      "templates":{tid:slots for tid,slots in per_template.items()},
    }
    json.dump(out, open(os.path.join(PB,"cc-slot-resolution-map.json"),"w"), indent=1, ensure_ascii=False)

    print("slots:",len(all_slots),"| interp:",out["counts"]["interpretive"],
          "fact:",out["counts"]["fact"],"flag:",out["counts"]["flag"],"gap:",out["counts"]["gap"])
    # GATE: natal templates (5*) must never resolve a slot to SEASONAL vocab/planet-in-sign, which is
    # current-sky content and leaks retrograde/season text into a birth chart.
    natal_seasonal = []
    for t in templates:
        tid = t["source_snapshot"]["templateId"]
        if not tid.startswith("5"):
            continue
        for s in t["sections"]["slots"]:
            spec = OVERRIDE.get((tid, s)) or INTERP.get(s)
            if spec and spec[0] == "vocab" and spec[1] == "planet-in-sign":
                natal_seasonal.append(f"{tid}:{s}")
    if natal_seasonal:
        print("NATAL-SEASONAL LEAK (natal template slot -> seasonal planet-in-sign):", natal_seasonal)
        raise SystemExit(1)
    if unmapped:
        print("UNMAPPED (%d):"%len(unmapped), ", ".join(unmapped)); raise SystemExit(1)
    if bad_source:
        print("BAD SOURCE (category not in library):")
        for s in bad_source: print("  ",s); raise SystemExit(1)
    print("OK: every slot classified; every interpretive source exists in the library.")

if __name__ == "__main__":
    main()
