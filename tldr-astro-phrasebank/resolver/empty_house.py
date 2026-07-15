#!/usr/bin/env python3
"""
empty_house.py — composer for the Me/Natal EMPTY HOUSE surface.

Every layer kept in its proper role (per Marie's editorial model):
  - cusp sign  -> names which planet rules the house (the chain)
  - ruler SIGN -> HOW: what you want this area to feel like
  - ruler HOUSE-> WHERE: the arena the ruler connects this area to
  - empty house-> the BEHAVIOR: the coping within this area
  - the close  -> WHY: the deeper concern underneath, brought back toward this area

Structure:
  1. "{CuspSign} is on the cusp of your empty {N}th house, so {ruler} rules {theme}."
  2. "Your {Ruler} is in {RulerSign} in the {M}th house, connecting {area} with {ruler-house rich}.
      With {ruler} in {RulerSign}, you want {area} to feel {sign qualities}."
  3. "You may {behavior}. Underneath, it's usually about {ruler-house concern}."

Inputs are chart facts (house, cuspSign, rulerSign, rulerHouse) from the reader's chart.
"""
import os, json

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# TRADITIONAL rulers only — the personal empty-house chain never uses an outer planet
SIGN_RULER = {"aries":"mars","taurus":"venus","gemini":"mercury","cancer":"moon",
    "leo":"sun","virgo":"mercury","libra":"venus","scorpio":"mars","sagittarius":"jupiter",
    "capricorn":"saturn","aquarius":"saturn","pisces":"jupiter"}
# modern co-rulers (outer planets) — used ONLY in expanded mode, via their natal house
MODERN_CORULER = {"scorpio":"pluto","aquarius":"uranus","pisces":"neptune"}
ORD = {1:"1st",2:"2nd",3:"3rd",4:"4th",5:"5th",6:"6th",7:"7th",8:"8th",9:"9th",10:"10th",11:"11th",12:"12th"}

# the empty house's domain, named in the chain ("... so {ruler} rules {theme}")
HOUSE_THEME = {1:"how you come across",2:"your money and self-worth",
    3:"your everyday thinking and talking",4:"your home and roots",
    5:"your creativity and pleasure",6:"your daily work and health",
    7:"your close partnerships",8:"your intimacy and shared resources",
    9:"your beliefs and horizons",10:"your public life and ambition",
    11:"your friendships and future",12:"your private, inner life"}

# shorter form for the "connecting {area} with ..." clause (varied to avoid repeating the theme)
HOUSE_SHORT = {1:"how you show up",2:"your money and worth",3:"your everyday mind",
    4:"home and family",5:"your creativity and pleasure",6:"your daily life",
    7:"your relationships",8:"your closeness with others",9:"your search for meaning",
    10:"your public life",11:"your friendships",12:"your inner life"}

# the ruler-house arena the empty house gets connected to
HOUSE_RICH = {
 1:"how you present yourself, your body, and the first move you make",
 2:"money, possessions, and your felt sense of your own worth",
 3:"communication, learning, siblings, and the daily back-and-forth",
 4:"home, family, and your emotional foundation",
 5:"creativity, romance, play, and self-expression",
 6:"work, health, routines, and the daily fixing of things",
 7:"partnership, close others, and the agreements between you",
 8:"trust, shared money, debt, intimacy, and the obligations that come with relying on someone else",
 9:"belief, study, travel, and the meaning you reach for",
 10:"career, reputation, and your public standing",
 11:"friendships, groups, and the future you're building toward",
 12:"solitude, rest, the unconscious, and what you keep private"}

# lived coping behavior when this is the EMPTY house ("You may {behavior}.")
# grounded in Marie's by-sign lunation cards; each moves from a recognizable behavior toward its cost
HOUSE_BEHAVIOR = {
 1:"manage the impression you make and stay alert to how you are being read, before you have had time to register how you feel",
 2:"hold tightly to money or possessions and use what you earn as proof of your worth, before you ask whether any of it helps you feel secure",
 3:"rehearse what to say and work to keep the conversation moving, leaving little room to hear your own thoughts",
 4:"retreat into familiar roles at home and guard your private space, even when what feels familiar no longer helps you feel safe",
 5:"look for proof that other people like what you make, until their response matters more than your enjoyment",
 6:"take on every task, tighten your routine, and keep going through exhaustion, until your body has to interrupt you",
 7:"give generously and hope your partner understands what you need without being told, then swallow what bothers you to preserve the bond. Over time, the relationship can have room for them but very little room for you",
 8:"hold back trust, keep a private tally of what each person owes, and prepare for betrayal before intimacy has had a chance to deepen",
 9:"look for answers in another trip, course, or teacher before trusting what your own experience has already taught you",
 10:"work harder to protect your reputation and control how others see you, until maintaining the role costs more than admitting it no longer fits",
 11:"make yourself useful to the group and call it belonging, even when every gathering leaves you feeling depleted",
 12:"withdraw, carry your worry in private, and tell yourself you can handle it alone, before you let anyone know how much it is costing you"}

# plain "it's usually about ___" concern when this is the RULER's house (the WHY)
HOUSE_ABOUT = {
 1:"who you are, how you get to show up, and whether you feel like yourself doing it",
 2:"what you can earn and own, and whether you believe you are worth having enough",
 3:"needing the right explanation, keeping up with what you do not know, and wondering whether you understand enough to trust your own conclusions",
 4:"home, family, and whether you have a place that actually feels safe",
 5:"being seen, having fun, and whether you are allowed to enjoy it without earning it",
 6:"your health, your work, and whether you can keep it together without running yourself down",
 7:"a close partnership, how decisions and responsibilities are shared, and whether both people have an equal say",
 8:"trust, shared money and obligations, and whether you can depend on someone to follow through",
 9:"whether you share the same values, have room to keep growing, and are building a life that still feels meaningful to you",
 10:"your work, your reputation, and whether you measure up to what is expected",
 11:"your friendships, where you belong, and whether these are really your people",
 12:"what you carry privately, what you have not said out loud, and whether you can let anyone in"}

BOILERPLATE = ("Everyone has all twelve houses. An empty house just means no natal planet "
    "sits there. The area still works; it may simply run quietly instead of being a constant "
    "focus. You read it through the sign on its cusp and the planet that rules that sign, then "
    "follow that planet to see where the theme actually lives.")

# the ruler-SIGN clause is sourced from the reviewed planet-in-sign bank (saved at build time
# by build_ruler_sign_clauses.py) and looked up here — never re-authored at runtime.
_CLAUSES = None
def _load_clauses():
    global _CLAUSES
    if _CLAUSES is None:
        with open(os.path.join(PKG, "phrasebank", "cc-ruler-sign-clauses.json")) as fh:
            _CLAUSES = json.load(fh)
    return _CLAUSES

def _ruler_sign_clause(planet, sign):
    return _load_clauses()["clauses"].get(f"{planet}|{sign}", "")

def _lc(s): return s[0].lower() + s[1:] if s else s

def _coruler_clause(cusp_sign, co_sign, co_house, aspects=None):
    """Expanded-mode secondary clause. SIGN = collective background (kept as 'your
    generation'); HOUSE = where the person meets it; aspects personalize when supplied.
    Never converts an outer planet's sign-only statement into first person."""
    outer = MODERN_CORULER[cusp_sign]
    gen = _load_clauses().get("generational", {}).get(f"{outer}|{co_sign}", "")
    s = (f"As {cusp_sign.capitalize()}'s modern co-ruler, {outer.capitalize()} in "
         f"{co_sign.capitalize()} adds a generational layer in the background: {_lc(gen)}")
    if not s.rstrip().endswith((".", "!", "?")):
        s = s.rstrip() + "."
    s += (f" It becomes personal through your {ORD[co_house]} house, where you meet that "
          f"pattern around {HOUSE_SHORT[co_house]}")
    if aspects:
        s += f", and because it {aspects}, it presses on you more directly"
    return s.rstrip() + "."


def compose_empty_house(house, cusp_sign, ruler_sign, ruler_house, banks=None,
                        expanded=False, co_ruler_sign=None, co_ruler_house=None, co_ruler_aspects=None):
    """Standard mode: the personal chain uses the TRADITIONAL ruler only. Expanded mode may
    add one modern co-ruler clause (for Scorpio/Aquarius/Pisces cusps) built from the outer
    planet's collective SIGN story + its natal HOUSE + optional aspects."""
    cusp_sign = cusp_sign.lower(); ruler_sign = ruler_sign.lower()
    ruler = SIGN_RULER[cusp_sign]                              # traditional ruler only
    Sign = cusp_sign.capitalize(); RulerSign = ruler_sign.capitalize()
    ruler_bare = ruler.capitalize()
    ruler_the = {"sun": "the Sun", "moon": "the Moon"}.get(ruler, ruler_bare)

    chain = f"{Sign} is on the cusp of your empty {ORD[house]} house, so {ruler_the} rules {HOUSE_THEME[house]}."
    placement = (f"Your {ruler_bare} is in {RulerSign} in the {ORD[ruler_house]} house, connecting "
                 f"{HOUSE_SHORT[house]} with {HOUSE_RICH[ruler_house]}. "
                 f"{_ruler_sign_clause(ruler, ruler_sign)}")
    close = f"You may {HOUSE_BEHAVIOR[house]}. Underneath, it's usually about {HOUSE_ABOUT[ruler_house]}."

    paragraphs = [chain, placement, close]
    mode = "standard"; coruler = None
    if expanded and cusp_sign in MODERN_CORULER and co_ruler_sign and co_ruler_house:
        coruler = _coruler_clause(cusp_sign, co_ruler_sign.lower(), int(co_ruler_house), co_ruler_aspects)
        paragraphs.append(coruler)
        mode = "expanded"

    return {
        "title": f"Empty {ORD[house]} House in {Sign}",
        "eyebrow": {"label": "Placement", "house": house, "cuspSign": cusp_sign, "ruler": ruler},
        "mode": mode,
        "boilerplate": BOILERPLATE,
        "paragraphs": paragraphs,
        "coRuler": coruler,
        "trace": {"house": house, "cuspSign": cusp_sign, "ruler": ruler,
                  "rulerSign": ruler_sign, "rulerHouse": ruler_house,
                  "modernCoRuler": MODERN_CORULER.get(cusp_sign),
                  "readerAuthority": "composed-reviewed"},
    }
