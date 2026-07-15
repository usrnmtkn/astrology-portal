#!/usr/bin/env python3
"""
transit_activation.py — the transit-to-natal-aspect ACTIVATION layer.

Composes a dated personal transit on top of the long-term house background, in the order:
  1. house       = the area of life undergoing change (slow bodies only; the background chapter)
  2. transiting planet = the longer process
  3. natal point = what is personally contacted
  4. aspect      = how the contact behaves   (from the reviewed aspect-pair bank)
  5. orb + pass  = timing and intensity

Fast planets (Sun/Moon/Mercury/Venus/Mars) have no house background here; their reading is
the aspect alone. When there is no tight natal aspect, the slow-body house passage stays in
the background and the reading says so, rather than inventing a sharp event.
"""
import os, sys, json, glob

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import transit_house as thouse  # noqa: E402

SLOW = {"jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north_node"}
ORD = thouse.ORD
ASPECT_WORD = {"conjunction": "conjunct", "square": "square", "opposition": "opposite",
               "trine": "trine", "sextile": "sextile"}
DISP = {"sun": "Sun", "moon": "Moon", "mercury": "Mercury", "venus": "Venus", "mars": "Mars",
        "jupiter": "Jupiter", "saturn": "Saturn", "uranus": "Uranus", "neptune": "Neptune",
        "pluto": "Pluto", "chiron": "Chiron", "north_node": "The North Node", "north-node": "the North Node",
        "ascendant": "Ascendant", "descendant": "Descendant", "midheaven": "Midheaven", "ic": "IC"}
ANGLES = {"ascendant", "descendant", "midheaven", "ic"}

_ASPECTS = None
def _aspects():
    global _ASPECTS
    if _ASPECTS is None:
        _ASPECTS = {}
        for f in glob.glob(os.path.join(PKG, "phrasebank", "cc-aspect-pair-reviewed*.json")):
            for r in json.load(open(f))["reviewed"]:
                _ASPECTS[r["id"].split("/")[-1]] = r
    return _ASPECTS

def _body_disp(b):  # sentence form
    return {"north_node": "The North Node", "moon": "the Moon", "sun": "the Sun"}.get(b, DISP.get(b, b.title()))

def _point_phrase(pt):
    return f"your {DISP[pt]}" if pt in ANGLES else f"your natal {DISP[pt]}"

def _timing(orb, phase, date):
    when = {"applying": f"building toward exact around {date}" if date else "building toward exact",
            "exact": f"exact around {date}" if date else "exact now",
            "separating": f"just past exact around {date} and easing" if date else "just past exact and easing"}[phase]
    strength = ("strongest right now" if orb is not None and orb <= 1
                else "close and clearly felt" if orb is not None and orb <= 3
                else "light and in the background for now")
    return f"This contact is {when}, and its effect is {strength}."

def compose_activation(transiting_body, aspect=None, natal_point=None, transiting_house=None,
                       orb=None, phase="applying", exact_date=None):
    """Returns a composed activation reading + trace. `aspect`+`natal_point` name the exact
    contact; `transiting_house` (for slow bodies) supplies the background chapter."""
    b = transiting_body.lower()
    paras = []; sources = []; layers = {}
    key = f"{b}-{aspect}-{natal_point.lower()}" if (aspect and natal_point) else None
    rec = _aspects().get(key) if key else None

    # 1. house background (slow bodies only)
    if b in SLOW and transiting_house and thouse.is_authored(b, transiting_house):
        theme = thouse.READINGS[b][transiting_house]["p1_theme"]
        intro = (f"{_body_disp(b)} is moving through your {ORD[transiting_house]} house, a longer "
                 f"chapter about {theme}.")
        if rec:
            intro += " Within that, a specific contact is coming into focus."
        paras.append(intro)
        sources += thouse.READINGS[b][transiting_house]["source_keys"]
        layers["house"] = transiting_house

    # 2-4. the exact aspect (from the reviewed aspect-pair bank)
    if key:
        aw = ASPECT_WORD.get(aspect, aspect)
        if rec:
            narrative = rec.get("expanded_narrative") or ""
            paras.append(f"Right now {_body_disp(b)} is {aw} {_point_phrase(natal_point.lower())}, which is "
                         f"what makes this personal. {narrative}")
            sources.append(f"cc/aspect-pair/{key}")
            layers["aspect"] = key
        else:
            layers["aspect"] = None  # no reviewed reading for this exact pair
    elif b in SLOW and transiting_house:
        # no tight aspect: the passage stays quiet (do not invent an event)
        paras.append("With no close aspect to a personal planet or angle right now, this chapter stays in "
                     "the background and develops through ordinary experience rather than a single sharp event.")
        layers["aspect"] = "none"

    # 5. timing / intensity (only when a real aspect reading is present)
    if orb is not None and rec:
        paras.append(_timing(orb, phase, exact_date))
        layers["timing"] = {"orb": orb, "phase": phase, "exact_date": exact_date}

    if not paras:
        return None  # no reviewed reading for this combo (fall back to the planetary horoscope)

    title = f"Transiting {_body_disp(b).replace('the ','the ')}"
    if aspect and natal_point:
        title += f" {ASPECT_WORD.get(aspect, aspect)} {_point_phrase(natal_point.lower())}"
    elif transiting_house:
        title += f" through your {ORD[transiting_house]} house"
    return {"title": title, "layers": layers, "paragraphs": paras,
            "requires_birth_time": bool(transiting_house) or natal_point in ANGLES if natal_point else bool(transiting_house),
            "trace": {"sourceKeys": sources, "readerAuthority": "composed-reviewed"}}
