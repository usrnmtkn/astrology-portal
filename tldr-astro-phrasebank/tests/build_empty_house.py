#!/usr/bin/env python3
"""
build_empty_house.py — emit the EMPTY HOUSE composition model + worked examples.

Empty houses are COMPOSED (not one flat paragraph per house): cusp sign -> ruler ->
where the ruler actually lives -> activation. The ruler-placement paragraph is composed
from the existing planet-in-sign / planet-in-house banks so it stays consistent with the
rest of the app. This writes the model (boilerplate + maps + templates) and two worked
examples matching the app's own pages, improved. Emits phrasebank/cc-empty-house-model.json.
"""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resolver"))
import empty_house as eh  # noqa: E402

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# the two app pages, recomposed (Taurus/12 -> Venus in Cap 8; Aries/11 -> Mars in Aq 9)
EXAMPLES = [(12, "taurus", "capricorn", 8), (11, "aries", "aquarius", 9)]
worked = [eh.compose_empty_house(*e) for e in EXAMPLES]

model = {
 "_meta": {"title": "Empty house composition model (Me/Natal)",
   "surface": "me.empty_house", "register": "natal second-person",
   "structure": ["boilerplate", "cusp clause (sign x house)", "ruler clause (sign -> ruler)",
                 "ruler placement (composed from planet-in-sign + planet-in-house banks)",
                 "activation clause"],
   "reuses": ["cc-planet-in-sign-reviewed.json (natal_sign_story)",
              "cc-planet-in-house-reviewed.json (house_domain)", "houses.json"],
   "fixes_vs_prior": ["no keyword stacks (lists capped at 3 concrete items)",
                      "no subject-verb agreement slips on plural house labels",
                      "dropped filler ('a birth chart can describe a pattern before it feels obvious')",
                      "ruler placement reused from banks instead of re-authored"],
   "inputs": "house, cuspSign, rulerSign, rulerHouse (from the reader's chart)"},
 "boilerplate": eh.BOILERPLATE,
 "sign_ruler": eh.SIGN_RULER,
 "house_theme": eh.HOUSE_THEME,
 "house_short": eh.HOUSE_SHORT,
 "house_rich": eh.HOUSE_RICH,
 "house_behavior": eh.HOUSE_BEHAVIOR,
 "house_about": eh.HOUSE_ABOUT,
 "ruler_sign_clause_source": "cc-ruler-sign-clauses.json (built from planet-in-sign bank; planet=function, sign=manner)",
 "layer_roles": {"cusp_sign": "names which planet rules the house (chain)",
                 "ruler_sign": "HOW: the ruling planet's function + the sign's manner (from planet-in-sign bank)",
                 "ruler_house": "WHERE: the arena the ruler connects this area to",
                 "empty_house": "the coping behavior within this area",
                 "close": "WHY: the deeper concern underneath, brought back toward this area"},
 "templates": {
   "chain": "{Sign} is on the cusp of your empty {ord} house, so {ruler} rules {houseTheme[emptyHouse]}.",
   "placement": "Your {Ruler} is in {RulerSign} in the {rulerOrd} house, connecting {houseShort[emptyHouse]} with {houseRich[rulerHouse]}. {rulerSignClause[ruler|rulerSign]}",
   "close": "You may {houseBehavior[emptyHouse]}. Underneath, it's usually about {houseAbout[rulerHouse]}."},
 "worked_examples": worked,
}
dest = os.path.join(PKG, "phrasebank", "cc-empty-house-model.json")
json.dump(model, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote empty-house composition model + {len(worked)} worked examples -> {dest}")
