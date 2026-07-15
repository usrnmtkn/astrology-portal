#!/usr/bin/env python3
"""
build_transit_house.py — emit the long-term house-transit readings + architecture.

Bespoke per (body, house), authored to editorial standard. Emits the composed readings for
every authored combination + coverage + the three-surface architecture note.
Emits phrasebank/cc-transit-house.json.
"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resolver"))
import transit_house as th  # noqa: E402

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
authored = [(b, h) for b in th.PLANET for h in range(1, 13) if th.is_authored(b, h)]
readings = [th.compose_transit_house(b, h) for b, h in authored]
pending = [f"{b}/{th.ORD[h]}" for b in th.PLANET for h in range(1, 13) if not th.is_authored(b, h)]

out = {"_meta": {"title": "Long-term house-transit readings (background layer)",
   "surface": "transits.house_transit", "requires_birth_time": True,
   "register": "personal, present-tense, non-deterministic; no em dashes",
   "authored": len(readings), "total": len(th.PLANET) * 12, "pending_bodies": sorted(
       {b for b in th.PLANET if not any(th.is_authored(b, h) for h in range(1, 13))}),
   "editorial_standard": ["names what the transit makes harder to avoid",
        "gives two or three recognizable experiences", "shows both difficult and useful expression",
        "closes on a concrete response", "traces to CC/Marie banks", "gated on birth time"],
   "three_surfaces": {
       "planetary_horoscope":"transiting planet + sign + rising -> whole-sign house (fast planets ok)",
       "personal_transit":"transit aspecting a natal point; the dated activation layer (aspect-pair bank)",
       "house_transit":"the 7 slow bodies through a house; this background layer"},
   "compose_order_when_combined":["house = area of life", "transiting planet = longer process",
        "natal point = what is contacted", "aspect = how the contact behaves",
        "orb + pass = timing and intensity"],
   "fast_planets":"excluded from THIS library; belong in planetary horoscopes + personal aspect transits",
   "duration_note":"duration/dates are calculated at render, not baked into the reusable copy; Chiron especially, since its orbit is uneven and it does not spend equal time in each house",
   "aspect_layer_hints":{"chiron_7th":{
      "chiron-venus":"questions about affection, desirability, or what someone accepts to keep a relationship",
      "chiron-moon":"care, dependence, or fear of being left becomes more immediate",
      "chiron-saturn":"exposes fear of rejection, criticism, or asking too much",
      "chiron-descendant":"makes the relationship story especially visible",
      "no_tight_aspect":"the house passage stays quieter and develops through ordinary relationship experiences"}}},
 "readings": readings, "pending": pending}
dest = os.path.join(PKG, "phrasebank", "cc-transit-house.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(readings)} authored house-transit readings ({len(pending)} pending) -> {dest}")
