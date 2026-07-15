"""
surface_resolver.py
-------------------
THE major missing surface fix.

The screenshots reveal that a "Sun in Cancer" tile on Home is NOT collective Sky
copy. It is a PERSONALIZED planetary horoscope:

    current planet + current sign
      -> house occupied in the user's RISING-SIGN chart
      -> one personalized life situation

For a Gemini-rising user:
    Cancer -> 2nd house
    Sun in Cancer  -> a 2nd-house story: security, money, worth, gifts, resources
    Moon in Cancer -> a 2nd-house story: care, livelihood, material support, replenishment

This resolver makes the surface distinctions EXECUTABLE so the composer never
again produces generic collective "Sun moving through Cancer" language on Home.

Each Surface picks a distinct narrative model and a distinct source-slot recipe.
These surfaces MUST NOT share one universal fallback paragraph.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

from lane_priority import Record, SOURCE_GAP


class Surface(str, Enum):
    # Home
    DAILY_HOROSCOPE = "home.daily_horoscope"
    MOON_PHASE = "home.moon_forecast.phase"
    MOON_SIGN = "home.moon_forecast.sign"
    PLANETARY_HOROSCOPE_LIST = "home.planetary_horoscopes.list"          # current body/sign list
    PLANETARY_HOROSCOPE_PERSONAL = "home.planetary_horoscopes.personal"  # body/sign via rising-sign house
    # Transits
    TRANSIT_SHORT = "transits.short_term"
    TRANSIT_LONG = "transits.long_term"
    TRANSIT_PERSONAL_CARD = "transits.personalized_card"
    # Me / Natal
    NATAL_PLACEMENT = "natal.placement"
    NATAL_ANGLE = "natal.angle"
    NATAL_ASPECT = "natal.aspect"
    # Sky (collective)
    SKY_PLANET_IN_SIGN = "sky.collective_planet_in_sign"
    SKY_ASPECT = "sky.current_aspect"
    SKY_RETROGRADE = "sky.retrograde_station"
    SKY_INGRESS = "sky.ingress_calendar"


# Which surfaces are personalized by the user's chart vs collective.
PERSONALIZED = {
    Surface.DAILY_HOROSCOPE,
    Surface.PLANETARY_HOROSCOPE_PERSONAL,
    Surface.TRANSIT_PERSONAL_CARD,
    Surface.NATAL_PLACEMENT,
    Surface.NATAL_ANGLE,
    Surface.NATAL_ASPECT,
}

COLLECTIVE = {
    Surface.MOON_PHASE,
    Surface.MOON_SIGN,
    Surface.PLANETARY_HOROSCOPE_LIST,
    Surface.TRANSIT_SHORT,
    Surface.TRANSIT_LONG,
    Surface.SKY_PLANET_IN_SIGN,
    Surface.SKY_ASPECT,
    Surface.SKY_RETROGRADE,
    Surface.SKY_INGRESS,
}


# Narrative model per surface (the "required narrative model" table).
NARRATIVE_MODEL: Dict[Surface, str] = {
    Surface.SKY_PLANET_IN_SIGN: "What is changing collectively; one recognizable situation; optional response.",
    Surface.PLANETARY_HOROSCOPE_LIST: "Current planet/sign, stated as a shared shift; no personal house.",
    Surface.PLANETARY_HOROSCOPE_PERSONAL: "Current planet/sign interpreted through the user's rising-sign house.",
    Surface.MOON_PHASE: "The phase's role in the lunar cycle, then an appropriate release/build/culmination action.",
    Surface.MOON_SIGN: "Short embodied guidance for the Moon's current sign.",
    Surface.DAILY_HOROSCOPE: "One concrete lived scenario with a specific, proportionate suggestion.",
    Surface.TRANSIT_PERSONAL_CARD: "Editorial headline, dates/exact date, one coherent lived situation, practical direction, factual footer.",
    Surface.NATAL_PLACEMENT: "Sign story integrated with house, then eligible modifiers and aspects.",
    Surface.SKY_ASPECT: "Two collective forces in contact; one situation; no personal claim.",
    Surface.SKY_RETROGRADE: "What the station/retrograde asks collectively; concrete example.",
    Surface.SKY_INGRESS: "A body changes sign on a date; the tone that shifts.",
    Surface.NATAL_ANGLE: "What the angle's sign says about how the user meets that domain of life.",
    Surface.NATAL_ASPECT: "Two natal placements in a standing relationship; one lived pattern.",
    Surface.TRANSIT_SHORT: "A near-term collective theme; one situation; optional response.",
    Surface.TRANSIT_LONG: "A slow collective theme named plainly; what it reshapes over time.",
}


@dataclass
class Request:
    surface: Surface
    body: Optional[str] = None          # e.g. "sun"
    current_sign: Optional[str] = None  # e.g. "cancer"
    aspect: Optional[str] = None        # e.g. "square"
    other_body: Optional[str] = None    # e.g. "saturn"
    rising_sign: Optional[str] = None   # e.g. "gemini"  (personalization axis)
    house: Optional[int] = None         # resolved / provided house
    phase: Optional[str] = None
    angle: Optional[str] = None
    has_birth_time: bool = False
    has_horizon: bool = False


@dataclass
class Recipe:
    """The ordered source-slot recipe the composer should try to fill."""
    surface: Surface
    narrative_model: str
    primary_sources: List[str] = field(default_factory=list)   # EXACT lane
    context_sources: List[str] = field(default_factory=list)   # CONTEXT lane
    slots: List[str] = field(default_factory=list)
    personalized: bool = False
    notes: str = ""


# --------------------------------------------------------------------------- #
# House math: which house a current sign occupies in a whole-sign chart built
# from the user's rising sign. (Whole-sign: rising sign = 1st house.)
# --------------------------------------------------------------------------- #
ZODIAC = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
]


def house_for(sign: str, rising_sign: str) -> int:
    s = ZODIAC.index(sign.lower())
    r = ZODIAC.index(rising_sign.lower())
    return ((s - r) % 12) + 1


# --------------------------------------------------------------------------- #
# The resolver
# --------------------------------------------------------------------------- #
def resolve(req: Request) -> Recipe:
    """
    Turn a surface request into an ordered source-slot recipe. This is the
    single place that decides, e.g., collective Sun-in-Cancer vs Gemini-rising
    Sun-in-Cancer-in-the-2nd-house.
    """
    nm = NARRATIVE_MODEL[req.surface]
    r = Recipe(surface=req.surface, narrative_model=nm,
               personalized=req.surface in PERSONALIZED)

    if req.surface is Surface.SKY_PLANET_IN_SIGN or req.surface is Surface.PLANETARY_HOROSCOPE_LIST:
        # Collective: exact planet-in-sign source, NO personal house.
        r.primary_sources = [f"cc/planet-in-sign/{req.body}-in-{req.current_sign}"]
        r.slots = ["situation", "optional_response"]
        r.notes = "Collective. Do not attach a personal house. Do not personalize."
        return r

    if req.surface is Surface.PLANETARY_HOROSCOPE_PERSONAL:
        # The personalized branch. Requires rising sign to locate the house.
        if not req.rising_sign:
            r.notes = "Missing rising sign; cannot personalize. Fall back to LIST surface, not to collective prose."
            return r
        house = req.house or house_for(req.current_sign, req.rising_sign)
        r.house = house
        # Exact source is the body-in-house personalization; sign is a light
        # modifier. The house SELECTS the scene; it does not generate a keyword list.
        r.primary_sources = [
            f"cc/planet-in-house/{req.body}-in-{_ord(house)}-house",
        ]
        r.context_sources = [
            f"cc/planet-in-sign/{req.body}-in-{req.current_sign}",  # tone only (refine)
            f"cc/house/{house}",                                    # locate only
        ]
        r.slots = ["situation"]
        r.notes = (f"{req.body} in {req.current_sign} -> {_ord(house)} house for "
                   f"{req.rising_sign} rising. Personalized life situation from the "
                   f"body/house scene; sign refines tone only.")
        return r

    if req.surface is Surface.MOON_PHASE:
        r.primary_sources = [f"cc/moon-phase/{req.phase}"]
        r.slots = ["phase_role", "phase_action"]
        r.notes = "Phase only. Keep separate from Moon sign."
        return r

    if req.surface is Surface.MOON_SIGN:
        r.primary_sources = [f"cc/moon-sign/{req.current_sign}"]
        r.slots = ["embodied_imperative"]
        r.notes = "Short embodied guidance. Keep separate from Moon phase."
        return r

    if req.surface is Surface.DAILY_HOROSCOPE:
        r.primary_sources = [f"cc/daily/{req.rising_sign}"] if req.rising_sign else []
        r.slots = ["lived_scenario", "proportionate_suggestion"]
        r.notes = "One concrete scenario + one proportionate suggestion."
        return r

    if req.surface is Surface.TRANSIT_PERSONAL_CARD:
        # e.g. Saturn square natal Venus. Exact aspect-pair is the primary source.
        pair = f"{req.other_body}-{req.aspect}-{req.body}"
        r.primary_sources = [f"cc/aspect-pair/{pair}"]
        r.context_sources = [
            f"cc/ref/outer-planets/{req.other_body}-transit",
            f"cc/planet/{req.body}", f"cc/planet/{req.other_body}",
        ]
        if req.house:
            r.context_sources.append(f"cc/house/{req.house}")
        r.slots = ["headline", "timing", "situation", "bridge",
                   "optional_response", "footer"]
        r.notes = ("Exact aspect-pair supplies the lived situation. House/planet/"
                   "ref records are supporting context only. Optional beats are "
                   "suppressed when they merely repeat. Technical facts stay in the footer.")
        return r

    if req.surface is Surface.NATAL_PLACEMENT:
        r.primary_sources = [f"cc/planet-in-sign/{req.body}-in-{req.current_sign}"]
        r.context_sources = [f"cc/house/{req.house}"] if req.house else []
        r.slots = ["sign_story", "house_integration", "sect_modifier",
                   "retrograde_modifier", "dignity_modifier", "ruler_bridge", "aspects"]
        r.notes = ("Sign story integrated with house, then eligible modifiers. "
                   "Sect/retro/dignity are conditional. Sect copy requires reliable "
                   "birth time + horizon.")
        return r

    if req.surface is Surface.NATAL_ASPECT:
        pair = f"{req.body}-{req.aspect}-{req.other_body}"
        r.primary_sources = [f"cc/aspect-pair/{pair}"]
        r.slots = ["standing_pattern"]
        r.notes = "Natal (standing) reading of the pair; not a timed transit."
        return r

    if req.surface is Surface.NATAL_ANGLE:
        r.primary_sources = [f"cc/angle/{req.angle}-in-{req.current_sign}"]
        r.slots = ["how_user_meets_domain"]
        return r

    if req.surface is Surface.SKY_ASPECT:
        pair = f"{req.body}-{req.aspect}-{req.other_body}"
        r.primary_sources = [f"cc/aspect-pair/{pair}"]
        r.slots = ["collective_situation", "optional_response"]
        r.notes = "Collective framing; no personal claim."
        return r

    if req.surface is Surface.SKY_RETROGRADE:
        r.primary_sources = [f"cc/ref/retrograde/{req.body}"]
        r.slots = ["collective_ask", "concrete_example"]
        return r

    if req.surface is Surface.SKY_INGRESS:
        r.primary_sources = [f"cc/ingress/{req.body}-into-{req.current_sign}"]
        r.slots = ["tone_shift"]
        return r

    if req.surface in (Surface.TRANSIT_SHORT, Surface.TRANSIT_LONG):
        r.primary_sources = [f"cc/planet-in-sign/{req.body}-in-{req.current_sign}"]
        r.slots = ["collective_theme", "optional_response"]
        return r

    r.notes = "Unmapped surface."
    return r


_ORDINALS = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th",
             7: "7th", 8: "8th", 9: "9th", 10: "10th", 11: "11th", 12: "12th"}


def _ord(n: int) -> str:
    return _ORDINALS[n]


if __name__ == "__main__":
    # Demonstrate the collective vs personalized divergence.
    collective = resolve(Request(Surface.SKY_PLANET_IN_SIGN, body="sun", current_sign="cancer"))
    personal = resolve(Request(Surface.PLANETARY_HOROSCOPE_PERSONAL, body="sun",
                               current_sign="cancer", rising_sign="gemini"))
    print("COLLECTIVE:", collective.primary_sources, "|", collective.notes)
    print("PERSONAL  :", personal.primary_sources, "house", personal.house, "|", personal.notes)
