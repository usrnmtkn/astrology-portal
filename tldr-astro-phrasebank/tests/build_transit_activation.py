#!/usr/bin/env python3
"""
build_transit_activation.py — emit the transit-to-natal-aspect activation architecture.

The activation layer is composed at render time from chart data (which body, which house it
is passing through, which natal point it aspects, the orb, the pass, and the exact date). It
is not a fixed matrix, so this emits the model + several worked examples.
Emits phrasebank/cc-transit-activation-model.json.
"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resolver"))
import transit_activation as ta  # noqa: E402

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAMPLES = [
 dict(transiting_body="saturn", aspect="square", natal_point="mars", transiting_house=7, orb=0.8, phase="applying", exact_date="March 3"),
 dict(transiting_body="mars", aspect="square", natal_point="saturn", orb=0.3, phase="exact", exact_date="today"),
 dict(transiting_body="pluto", aspect="conjunction", natal_point="sun", transiting_house=11, orb=2, phase="separating", exact_date="last month"),
 dict(transiting_body="saturn", transiting_house=7),
 dict(transiting_body="moon", aspect="conjunction", natal_point="jupiter", orb=1, phase="applying", exact_date="this evening"),
]
worked = [ta.compose_activation(**e) for e in EXAMPLES]

model = {"_meta": {"title": "Transit-to-natal-aspect activation layer",
   "surface": "transits.activation", "requires_birth_time": "when a house or angle is involved",
   "composed_at_render_from": ["transiting body", "house it is passing through", "natal point aspected",
                               "aspect", "orb", "pass (applying/exact/separating)", "exact date"],
   "compose_order": ["house = area of life (slow bodies; the background chapter)",
                     "transiting planet = the longer process", "natal point = what is contacted",
                     "aspect = how the contact behaves (from the reviewed aspect-pair bank)",
                     "orb + pass = timing and intensity"],
   "aspect_source": "cc-aspect-pair-reviewed*.json (470 reviewed readings; fast + slow bodies)",
   "fast_planets":"aspect-only (no house background); Sun/Moon/Mercury/Venus/Mars belong here",
   "no_tight_aspect":"the slow-body house passage stays in the background; the reading says so rather than inventing an event"},
 "worked_examples": worked}
dest = os.path.join(PKG, "phrasebank", "cc-transit-activation-model.json")
json.dump(model, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote transit-activation model + {len(worked)} worked examples -> {dest}")
