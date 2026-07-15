#!/usr/bin/env python3
"""
build_ruler_sign_clauses.py — the ruler-SIGN clause for the empty-house composer.

Sourced from the reviewed planet-in-sign bank (natal_sign_story): the PLANET supplies the
function/verb, the SIGN describes how it operates. Built once here and SAVED, so the
composer never re-authors it at runtime. Approved exceptions (where the "you want {area}
to feel {qualities}" feel-frame reads more naturally) are overridden explicitly.

Emits phrasebank/cc-ruler-sign-clauses.json  (keyed "planet|sign").
"""
import json, os

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# only the 7 TRADITIONAL rulers ever rule the personal empty-house chain
RULERS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]
# outer planets are modern CO-rulers only (expanded mode) — their stories stay generational
OUTERS = ["uranus", "neptune", "pluto"]
THE = {"sun": "the Sun", "moon": "the Moon"}

# approved feel-frame overrides (read more naturally than the raw bank story)
OVERRIDE = {
 "moon|leo": "With the Moon in Leo, you want love to feel wholehearted, loyal, and recognized.",
}

def lc(s):  # lowercase the first letter so it flows after the prefix
    return s[0].lower() + s[1:] if s else s

def main():
    pis = {(r["body"], r["sign"]): r["natal_sign_story"]
           for r in json.load(open(os.path.join(PKG, "phrasebank",
                    "cc-planet-in-sign-reviewed.json")))["reviewed"]}
    SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio",
             "sagittarius","capricorn","aquarius","pisces"]
    clauses = {}
    for planet in RULERS:
        P = THE.get(planet, planet.capitalize())
        for sign in SIGNS:
            key = f"{planet}|{sign}"
            if key in OVERRIDE:
                clauses[key] = OVERRIDE[key]; continue
            story = pis.get((planet, sign))
            if not story:
                continue
            clause = f"With {P} in {sign.capitalize()}, {lc(story)}"
            if not clause.rstrip().endswith((".", "!", "?")):
                clause = clause.rstrip() + "."
            clauses[key] = clause

    # generational stories for the outer co-rulers (kept as-is: collective, "your generation")
    generational = {}
    for outer in OUTERS:
        for sign in SIGNS:
            story = pis.get((outer, sign))
            if story:
                generational[f"{outer}|{sign}"] = story

    out = {"_meta": {"title": "Ruler-sign clauses for empty-house composer (saved, reviewed)",
            "count": len(clauses), "source": "cc-planet-in-sign-reviewed.json (natal_sign_story)",
            "model": "planet = function/verb; sign = how it operates",
            "rulers": "7 traditional only (outer planets are co-rulers, expanded mode)",
            "overrides": list(OVERRIDE),
            "note": "Built once and saved; the composer looks these up, never re-authoring at runtime. "
                    "'generational' holds the outer co-rulers' collective sign stories for expanded mode."},
           "clauses": clauses, "generational": generational}
    dest = os.path.join(PKG, "phrasebank", "cc-ruler-sign-clauses.json")
    json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
    print(f"wrote {len(clauses)} personal ruler-sign clauses + {len(generational)} generational "
          f"co-ruler stories ({len(OVERRIDE)} override) -> {dest}")

if __name__ == "__main__":
    main()
