from fastapi import APIRouter

router = APIRouter(tags=["reference"])


HOUSE_SYSTEMS = [
    {"id": "whole_sign", "label": "Whole Sign", "default": True, "swissEphCode": "W"},
    {"id": "placidus", "label": "Placidus", "default": False, "swissEphCode": "P"},
    {"id": "koch", "label": "Koch", "default": False, "swissEphCode": "K"},
    {"id": "equal", "label": "Equal", "default": False, "swissEphCode": "E"},
    {"id": "porphyry", "label": "Porphyry", "default": False, "swissEphCode": "O"},
    {"id": "regiomontanus", "label": "Regiomontanus", "default": False, "swissEphCode": "R"},
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
    "True Node",
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
            "synastry": False,
            "composite": False,
            "timeLords": False,
            "contentFacts": False,
        },
    }


@router.get("/houses/systems")
def house_systems():
    return {"houseSystems": HOUSE_SYSTEMS}
