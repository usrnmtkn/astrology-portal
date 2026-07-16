#!/usr/bin/env python3
"""
build_compatibility_writeups.py — Co-Star-style long-form compatibility write-ups.

For each compatibility planet and sign pair, composes a flowing write-up:
  function  → "Mercury is how each of you thinks, talks, and needs to be understood."
  your_line → "Your Mercury is in Pisces, meaning <her book description, verbatim>."
  their_line→ "Their Mercury is in Aquarius, meaning <same description, pronoun-shifted>."
  synthesis → relationship-type dynamic + a practical adjustment.
  match     → a short harmony label.

Sources:
  - sources/book-as-above-extract.json  (planet_in_sign: her verbatim per-sign descriptions)
  - sources/compatibility-compare-contrast.json  (function, nouns, watch/try, sign elements)

Emits phrasebank/cc-compatibility-writeups.json. The app can render the scannable
Shared/Different/Watch/Try card AND this long-form write-up (a "go deeper" view).
Tier: your_line = CONFIRMED verbatim (framed); their_line = voiced-original-grounded
(pronoun-shifted from her verbatim). Status DRAFT pending sign-off.
"""
import json, os, re, itertools

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# voiced descriptions = Marie's sharper reviewed article voice (natal_sign_story),
# per editorial voice-pass — replaces the book's flatter textbook register.
DESC = json.load(open(os.path.join(PKG, "sources", "compat-voiced-descriptions.json")))["descriptions"]
CC = json.load(open(os.path.join(PKG, "sources", "compatibility-compare-contrast.json")))
DEST = os.path.join(PKG, "phrasebank", "cc-compatibility-writeups.json")

SIGNS = CC["signs"]
ORDER = list(SIGNS.keys())
PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]
GLYPH = {"sun":"☉","moon":"☽","mercury":"☿","venus":"♀","mars":"♂","jupiter":"♃","saturn":"♄"}

MATCH = {"same_sign":"Two of a kind", "same_element":"Naturally in sync", "complementary":"Easy chemistry",
         "opposition":"Opposites that complete", "friction":"Takes work", "mixed":"Mixed signals"}

def sign_distance(a, b):
    d = abs(ORDER.index(a) - ORDER.index(b)) % 12
    return min(d, 12 - d)

def relationship(a, b):
    if a == b: return "same_sign"
    ea, eb = SIGNS[a]["element"], SIGNS[b]["element"]
    if sign_distance(a, b) == 6: return "opposition"
    if ea == eb: return "same_element"
    if {ea, eb} in ({"fire","air"}, {"earth","water"}): return "complementary"
    if {ea, eb} in ({"fire","water"}, {"earth","air"}): return "friction"
    return "mixed"

# ordered whole-word replacements: 2nd person -> 3rd person (for the "their" line)
_REPL = [(r"\byou're\b","they're"),(r"\bYou're\b","They're"),
         (r"\byourself\b","themselves"),(r"\bYourself\b","Themselves"),
         (r"\byours\b","theirs"),(r"\bYours\b","Theirs"),
         (r"\byour\b","their"),(r"\bYour\b","Their"),
         (r"\byou\b","they"),(r"\bYou\b","They")]
def to_third(s):
    for pat, rep in _REPL:
        s = re.sub(pat, rep, s)
    return s

def first_sentence(fn):
    return fn

def synthesis(planet, a, b):
    rel = relationship(a, b)
    p = CC["planets"][planet]
    return f"{p['watch'][rel]} {p['try'][rel]}"

def compose(planet, a, b):
    desc = DESC.get(planet, {})
    da, db = desc.get(a), desc.get(b)
    if not da or not db:
        return None
    fn = CC["planets"][planet]["function"]
    Pl = planet.title()
    same = (a == b)
    if same:
        # collapse the identical description into one shared paragraph (no repeat).
        # The app should ALSO differentiate by house at render time (each person's
        # same-sign planet usually falls in a different house).
        your_line = f"You both have {Pl} in {a.title()}, meaning {da[0].lower()+da[1:]}"
        their_line = ""
    else:
        your_line = f"Your {Pl} is in {a.title()}, meaning {da[0].lower()+da[1:]}"
        their_line = f"Their {Pl} is in {b.title()}, meaning {to_third(db[0].lower()+db[1:])}"
    return {
        "glyph": GLYPH[planet],
        "match": MATCH[relationship(a, b)],
        "function": fn,
        "your_line": your_line,
        "their_line": their_line,
        "same_sign": same,
        # Houses require birth times we can't count on, so compatibility runs on
        # signs only — no house naming or house-based branch.
        "same_sign_line": CC["planets"][planet].get("same_sign", "") if same else "",
        # No standalone quote block. Quotes were only ever meant to be woven into
        # the prose where they fit, not surfaced as random attributed pull-quotes.
        "same_sign_quote": None,
        "verdict": CC["planets"][planet].get("verdict", {}).get(relationship(a, b), ""),
        "synthesis": synthesis(planet, a, b),
        "relationship": relationship(a, b),
        "tier": "descriptions = REVIEWED authored voice (natal_sign_story); their_line pronoun-shifted; synthesis/match voiced-original",
        "status": "DRAFT",
    }

cards = {}
missing = []
for planet in PLANETS:
    cards[planet] = {}
    for a, b in itertools.product(ORDER, repeat=2):
        c = compose(planet, a, b)
        if c is None:
            missing.append((planet, a, b)); continue
        cards[planet].setdefault(a, {})[b] = c

out = {"_meta": {"title": "Compatibility long-form write-ups (Co-Star style)",
        "model": "function + your_line (her verbatim, framed) + their_line (pronoun-shifted) + synthesis + match label",
        "planets": PLANETS, "status": "DRAFT — pending editorial sign-off",
        "note": CC["_meta"]["provenance"]},
       "cards": cards}
json.dump(out, open(DEST, "w"), indent=2, ensure_ascii=False)
n = sum(len(v)*len(next(iter(v.values()))) for v in cards.values() if v)
print(f"built {n} long-form compatibility write-ups for {PLANETS} -> {DEST}")
if missing:
    print("  missing book descriptions for:", missing[:6], "..." if len(missing)>6 else "")

if __name__ == "__main__" and os.environ.get("DEMO"):
    c = cards["mercury"]["pisces"]["aquarius"]
    print(f"\n--- Mercury · You: Pisces · Them: Aquarius  [{c['match']}] ---")
    print(c["function"]); print(c["your_line"]); print(c["their_line"]); print(c["synthesis"])
