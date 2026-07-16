#!/usr/bin/env python3
"""
build_compatibility_cards.py — compose Shared/Different/Watch/Try compatibility
cards for every same-planet sign pair, from the primitives in
sources/compatibility-compare-contrast.json.

Emits phrasebank/cc-compatibility-cards.json as a static lookup:
  cards[planet][you_sign][their_sign] = {shared, different, watch, try, function, nouns}

The app (Codex) just looks these up and renders the four labeled lanes — no
runtime template composition, no vocab concatenation. Replaces the app-generated
"water-led rhythm / planet topics / slice(0,3)" copy flagged in the
compatibility error report.
"""
import json, os, itertools

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(PKG, "sources", "compatibility-compare-contrast.json")
DEST = os.path.join(PKG, "phrasebank", "cc-compatibility-cards.json")

data = json.load(open(SRC))
SIGNS = data["signs"]
ORDER = list(SIGNS.keys())

def sign_distance(a, b):
    ia, ib = ORDER.index(a), ORDER.index(b)
    d = abs(ia - ib) % 12
    return min(d, 12 - d)

def relationship(a, b):
    """Classify the relationship between two signs for Shared/Watch/Try keys."""
    if a == b:
        return "same_sign"
    ea, eb = SIGNS[a]["element"], SIGNS[b]["element"]
    if sign_distance(a, b) == 6:
        return "opposition"
    if ea == eb:
        return "same_element"
    compatible = ({ea, eb} == {"fire", "air"}) or ({ea, eb} == {"earth", "water"})
    friction = ({ea, eb} == {"fire", "water"}) or ({ea, eb} == {"earth", "air"})
    if compatible:
        return "complementary"
    if friction:
        return "friction"
    return "mixed"

def shared_line(planet_data, a, b):
    rel = relationship(a, b)
    sh = planet_data["shared"]
    if rel == "same_sign":
        return sh["same_sign"]
    if SIGNS[a]["element"] == SIGNS[b]["element"]:
        return sh[SIGNS[a]["element"]]
    return sh["cross"]

def compose(planet, planet_data, a, b):
    rel = relationship(a, b)
    ta, tb = planet_data["traits"][a], planet_data["traits"][b]
    different = (f"You both {ta['same']} — the risk is a shared blind spot, not a clash."
                 if a == b else f"{ta['diff']}; {tb['diff']}.")
    watch_key = rel if rel in planet_data["watch"] else "mixed"
    try_key = rel if rel in planet_data["try"] else "mixed"
    return {
        "function": planet_data["function"],
        "nouns": planet_data["nouns"],
        "shared": shared_line(planet_data, a, b),
        "different": different,
        "watch": planet_data["watch"][watch_key],
        "try": planet_data["try"][try_key],
        "relationship": rel,
        "tier": "voiced-original-grounded",
        "status": "DRAFT",
    }

cards = {}
for planet, pdata in data["planets"].items():
    if "traits" not in pdata:
        continue
    cards[planet] = {}
    for a, b in itertools.product(ORDER, repeat=2):
        cards[planet].setdefault(a, {})[b] = compose(planet, pdata, a, b)

out = {
    "_meta": {
        "title": "Compatibility compare/contrast cards (Shared/Different/Watch/Try)",
        "note": data["_meta"]["provenance"],
        "planets": list(cards.keys()),
        "pairs_per_planet": len(ORDER) ** 2,
        "status": "DRAFT — pending editorial sign-off",
    },
    "cards": cards,
}
json.dump(out, open(DEST, "w"), indent=2, ensure_ascii=False)
n = sum(len(v) * len(next(iter(v.values()))) for v in cards.values())
print(f"built compatibility cards for {list(cards.keys())} -> {n} sign-pair cards -> {DEST}")

if __name__ == "__main__" and os.environ.get("DEMO"):
    for a, b in [("scorpio", "cancer"), ("cancer", "cancer"), ("scorpio", "aquarius"), ("aries", "libra")]:
        c = cards["moon"][a][b]
        print(f"\n--- Moon · You: {a.title()} · Them: {b.title()}  [{c['relationship']}] ---")
        for lane in ("shared", "different", "watch", "try"):
            print(f"  {lane.title():9} {c[lane]}")
