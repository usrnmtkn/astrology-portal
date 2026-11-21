import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.services.solar_return import (
    SOLAR_RETURN_BRACKET_STEP_DAYS,
    SOLAR_RETURN_CONVERGENCE_TOLERANCE_DEGREES,
    SOLAR_RETURN_MAX_BISECTIONS,
    SOLAR_RETURN_SEARCH_HALF_WINDOW_DAYS,
)


client = TestClient(app)
CALCULATION_INPUT = json.loads(
    (Path(__file__).parent / "fixtures" / "synthetic_report_2026.json").read_text()
)

EXPECTED_NATAL_COLOPHON_FACTS = {
    "Sun": ("Capricorn", 11, 2, 10, False),
    "Moon": ("Pisces", 6, 5, 12, False),
    "Mercury": ("Capricorn", 25, 36, 10, True),
    "Venus": ("Aquarius", 6, 12, 11, True),
    "Mars": ("Sagittarius", 10, 9, 9, False),
    "Jupiter": ("Cancer", 5, 7, 4, True),
    "Saturn": ("Capricorn", 15, 41, 10, False),
    "Uranus": ("Capricorn", 5, 48, 10, False),
    "Neptune": ("Capricorn", 12, 3, 10, False),
    "Pluto": ("Scorpio", 17, 6, 8, False),
}
EXPECTED_NATAL_ANGLES = {
    "Ascendant": ("Aries", 20, 40, 1),
    "Midheaven": ("Capricorn", 11, 6, 10),
}
EXPECTED_PROVENANCE = {
    "schemaVersion": "canonical-natal-v2",
    "inputHash": "7b87743a43b044a39423999af5427fc435b939e41096a33f1fccc4feecb27f77",
    "resultHash": "a6849716003afe171049473a4912f4133d4b2145ee223b5301fa913fe3d75731",
    "provenanceHash": "1f96fb4a3183d2f8c1e2749d05c9af8a08d565d999940f72c03ac38659573944",
}


def _position_tuple(position):
    return (
        position["sign"],
        position["degree"],
        position["minute"],
        position["house"],
        position["retrograde"],
    )


def _angle_tuple(position):
    return (
        position["sign"],
        position["degree"],
        position["minute"],
        position["house"],
    )


def test_canonical_report_path_pins_every_customer_colophon_position(
    assert_known_ephemeris_profile,
):
    response = client.post(
        "/timing/report-window",
        json={
            "natalSubject": CALCULATION_INPUT["natalSubject"],
            "location": CALCULATION_INPUT["returnLocation"],
            **CALCULATION_INPUT["window"],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert_known_ephemeris_profile(body["natal"]["metadata"])
    calculated_positions = {
        position["point"]: position for position in body["natal"]["positions"]
    }
    for point, expected in EXPECTED_NATAL_COLOPHON_FACTS.items():
        assert _position_tuple(calculated_positions[point]) == expected
    for point, expected in EXPECTED_NATAL_ANGLES.items():
        assert _angle_tuple(body["natal"]["angles"][point]) == expected
    assert body["natal"]["metadata"]["chartProvenance"] == EXPECTED_PROVENANCE


def test_solar_return_solve_and_location_contract_are_pinned():
    assert SOLAR_RETURN_SEARCH_HALF_WINDOW_DAYS == 8.0
    assert SOLAR_RETURN_BRACKET_STEP_DAYS == 0.125
    assert SOLAR_RETURN_CONVERGENCE_TOLERANCE_DEGREES == 0.0001
    assert SOLAR_RETURN_MAX_BISECTIONS == 64
    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": CALCULATION_INPUT["natalSubject"],
            "targetDate": "2026-01-01",
            "returnLocation": CALCULATION_INPUT["returnLocation"],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["returnMoment"] == "2026-01-01T10:47:24Z"
    assert body["location"]["latitude"] == 40.712749
    assert body["location"]["longitude"] == -74.005994
    assert _angle_tuple(body["chart"]["angles"]["Ascendant"]) == (
        "Sagittarius",
        18,
        35,
        1,
    )
    assert _angle_tuple(body["chart"]["angles"]["Midheaven"]) == (
        "Libra",
        9,
        44,
        11,
    )
