import json
import sys
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
TESTS_DIR = Path(__file__).parent
REPO_ROOT = TESTS_DIR.parents[2]
CALCULATION_INPUT = json.loads(
    (TESTS_DIR / "fixtures" / "marie_report_2026.json").read_text()
)
FROZEN_REPORT_FACTS = json.loads(
    (REPO_ROOT / "scripts" / "fixtures" / "marie-report-frozen-facts.json").read_text()
)

EXPECTED_NATAL_COLOPHON_FACTS = {
    "Sun": ("Aquarius", 29, 25, 9, False),
    "Moon": ("Scorpio", 12, 47, 6, False),
    "Mercury": ("Pisces", 7, 4, 10, False),
    "Venus": ("Capricorn", 14, 57, 8, False),
    "Mars": ("Aquarius", 22, 46, 9, False),
    "Jupiter": ("Leo", 0, 57, 3, True),
    "Saturn": ("Virgo", 11, 25, 4, True),
    "Uranus": ("Scorpio", 20, 59, 6, False),
    "Neptune": ("Sagittarius", 20, 12, 7, False),
    "Pluto": ("Libra", 19, 0, 5, True),
}
EXPECTED_NATAL_ANGLES = {
    "Ascendant": ("Gemini", 11, 9, 1),
    "Midheaven": ("Aquarius", 16, 36, 9),
}
EXPECTED_PROVENANCE = {
    "schemaVersion": "canonical-natal-v1",
    "inputHash": "fb05352ef71f1ef7f7e2dac411cb0a6c1cfaf111041006e5c74e00344be5f533",
    "resultHash": "010b50926e4b53c1e9a011e3a0fce994b6ff15ab372dc0d38a4983683e3ac51b",
    "provenanceHash": "0f32a2b01ba5688d0adff9b98da7a59105edd1e9b9d3b41ba266132aa0bfc5ed",
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

    pluto = calculated_positions["Pluto"]
    assert round(pluto["speed"], 5) == -0.01539
    calculated_provenance = body["natal"]["metadata"]["chartProvenance"]
    assert calculated_provenance["inputHash"] == EXPECTED_PROVENANCE["inputHash"]
    # The frozen report records the production/API-CI Linux provenance. Swiss
    # house-cusp floating-point output can differ below the displayed precision
    # on macOS, while every customer-facing placement remains byte-identical.
    if sys.platform.startswith("linux"):
        assert calculated_provenance == EXPECTED_PROVENANCE

    frozen_natal = FROZEN_REPORT_FACTS["natal"]
    frozen_positions = {
        position["point"]: position for position in frozen_natal["positions"]
    }
    for point in EXPECTED_NATAL_COLOPHON_FACTS:
        assert _position_tuple(frozen_positions[point]) == _position_tuple(
            calculated_positions[point]
        )
    for point in EXPECTED_NATAL_ANGLES:
        assert _angle_tuple(frozen_natal["angles"][point]) == _angle_tuple(
            body["natal"]["angles"][point]
        )
    assert frozen_natal["metadata"]["chartProvenance"] == EXPECTED_PROVENANCE


def test_solar_return_solve_and_location_contract_are_pinned():
    assert SOLAR_RETURN_SEARCH_HALF_WINDOW_DAYS == 8.0
    assert SOLAR_RETURN_BRACKET_STEP_DAYS == 0.125
    assert SOLAR_RETURN_CONVERGENCE_TOLERANCE_DEGREES == 0.0001
    assert SOLAR_RETURN_MAX_BISECTIONS == 64

    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": CALCULATION_INPUT["natalSubject"],
            "targetDate": "2026-02-18",
            "returnLocation": CALCULATION_INPUT["returnLocation"],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["returnMoment"] == "2026-02-18T01:59:11Z"
    assert body["location"]["latitude"] == 40.7831
    assert body["location"]["longitude"] == -73.9712
    assert _angle_tuple(body["chart"]["angles"]["Ascendant"]) == (
        "Libra", 11, 0, 1
    )
    assert _angle_tuple(body["chart"]["angles"]["Midheaven"]) == (
        "Cancer", 12, 46, 10
    )

    frozen_solar_return = FROZEN_REPORT_FACTS["solarReturn"]
    assert frozen_solar_return["returnMoment"] == body["returnMoment"]
    assert _angle_tuple(
        frozen_solar_return["chart"]["angles"]["Ascendant"]
    ) == _angle_tuple(body["chart"]["angles"]["Ascendant"])
    assert _angle_tuple(
        frozen_solar_return["chart"]["angles"]["Midheaven"]
    ) == _angle_tuple(body["chart"]["angles"]["Midheaven"])
