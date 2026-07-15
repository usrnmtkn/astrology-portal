from fastapi import APIRouter

router = APIRouter(tags=["reference"])


HOUSE_SYSTEMS = [
    {"id": "whole_sign", "label": "Whole Sign", "default": True, "swissEphCode": "W"},
]

BODIES = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "North Node",
    "Chiron",
    "Lilith",
]


@router.get("/reference/config")
def reference_config():
    return {
        "bodies": BODIES,
        "houseSystems": HOUSE_SYSTEMS,
        "zodiacModes": ["tropical", "sidereal"],
        "aspectProfiles": ["standard", "tight"],
        "timingSystems": ["profections", "zodiacal_releasing", "firdaria"],
        "features": {
            "natal": True,
            "currentSky": True,
            "transits": True,
            "synastry": True,
            "composite": True,
            "timeLords": True,
            "contentFacts": False,
        },
    }


@router.get("/houses/systems")
def house_systems():
    return {"houseSystems": HOUSE_SYSTEMS}
