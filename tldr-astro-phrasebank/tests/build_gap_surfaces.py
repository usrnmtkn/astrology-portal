#!/usr/bin/env python3
"""
build_gap_surfaces.py — emit the three gap-closing surfaces to phrasebank JSON:
  1. synastry house overlays  (10 planets x 12 houses = 120)
  2. composite aspects        (15 key pairs x 5 aspects = 75)
  3. planetary horoscope      (5 fast planets x 12 houses = 60)
All tier REVIEWED (composed from reviewed source banks); needs Marie sign-off.
"""
import os, sys, json
PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PKG, "resolver"))
import synastry_overlay as so
import composite_aspect as ca
import planetary_horoscope as ph
import natal_aspect as na

ASPECTS = ["conjunction", "square", "opposition", "trine", "sextile"]

def emit(name, records):
    path = os.path.join(PKG, "phrasebank", name)
    json.dump({"tier": "REVIEWED", "reviewed": records}, open(path, "w"), indent=1)
    return len(records)

def main():
    # 1. synastry overlays
    ov = []
    for pl in so.PLANET:
        for h in range(1, 13):
            o = so.compose_overlay(pl, h)
            ov.append({"id": f"cc/synastry/overlay/{pl}-{h}", "kind": "synastry_house_overlay_full",
                       "planet": pl, "house": h, "title": o["title"],
                       "paragraphs": o["paragraphs"], "trace": o["trace"]})
    n1 = emit("cc-synastry-overlay-full.json", ov)

    # 2. composite aspects
    cx = []
    for key in ca.PAIRS:
        a, b = key.split("-")
        for asp in ASPECTS:
            o = ca.compose_composite_aspect(a, b, asp)
            cx.append({"id": f"cc/composite/aspect/{key}-{asp}", "kind": "composite_aspect",
                       "pair": key, "aspect": asp, "generational": o["generational"],
                       "astro": o["astro"], "experience": o["experience"], "guidance": o["guidance"],
                       "note": o["note"], "title": o["title"], "paragraphs": o["paragraphs"],
                       "trace": o["trace"]})
    n2 = emit("cc-composite-aspect.json", cx)

    # 3. planetary horoscope
    hx = []
    for pl in ph.FAST:
        for h in range(1, 13):
            o = ph.compose_horoscope(pl, house=h)
            hx.append({"id": f"cc/horoscope/{pl}-{h}", "kind": "planetary_horoscope",
                       "planet": pl, "house": h, "title": o["title"],
                       "paragraphs": o["paragraphs"], "trace": o["trace"]})
    n3 = emit("cc-planetary-horoscope.json", hx)

    # 4. natal aspects (own-chart, astronomically constrained)
    nx = []
    for key in na.PAIRS:
        a, b = key.split("-")
        for asp in ASPECTS:
            o = na.compose_natal_aspect(a, b, asp)
            if o is None:  # astronomically impossible for this pair
                continue
            nx.append({"id": f"cc/natal/aspect/{key}-{asp}", "kind": "natal_aspect",
                       "pair": key, "aspect": asp, "generational": o["generational"],
                       "astro": o["astro"], "experience": o["experience"], "guidance": o["guidance"],
                       "note": o["note"], "title": o["title"], "paragraphs": o["paragraphs"],
                       "trace": o["trace"]})
    n4 = emit("cc-natal-aspect.json", nx)

    print(f"synastry overlays: {n1}  |  composite aspects: {n2}  |  planetary horoscope: {n3}  |  natal aspects: {n4}")

if __name__ == "__main__":
    main()
