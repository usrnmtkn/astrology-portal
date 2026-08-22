import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.services.aspect_profile import (
    canonical_sky_aspect_definitions,
    canonical_sky_aspect_orbs,
    canonical_sky_point_names,
)

client = TestClient(app)


def test_sky_current_fixture_new_york():
    fixture_path = Path(__file__).parent / "fixtures" / "sky_current_new_york_2026_06_16.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/sky/current", json=fixture["request"])

    assert response.status_code == 200
    sky = response.json()
    expected = fixture["expected"]
    positions = {position["point"]: position for position in sky["positions"]}

    assert sky["metadata"]["houseSystem"] == expected["houseSystem"]
    assert sky["metadata"]["zodiac"] == expected["zodiac"]
    assert sky["metadata"]["ephemeris"]["requestedEngine"] == "swiss"
    assert sky["metadata"]["ephemeris"]["actualEngine"] in {"swiss", "jpl", "moshier", "mixed"}
    assert sky["metadata"]["ephemeris"]["calculations"] > 0
    assert sky["generatedAt"] == expected["generatedAt"]
    assert sky["ascendant"] == expected["ascendant"]["sign"]
    assert abs(sky["ascendantLongitude"] - expected["ascendant"]["longitude"]) < 0.01
    assert sky["midheaven"] == expected["midheaven"]["sign"]
    assert abs(sky["midheavenLongitude"] - expected["midheaven"]["longitude"]) < 0.01
    assert sky["moonPhase"] == expected["moonPhase"]
    assert abs(sky["moonIllumination"] - expected["moonIllumination"]) < 0.001
    assert sky["moonStatus"]["kind"] == expected["moonStatus"]["kind"]
    assert sky["moonStatus"]["sign"] == expected["moonStatus"]["sign"]
    assert sky["moonStatus"]["nextSign"] == expected["moonStatus"]["nextSign"]
    assert sky["moonStatus"]["until"] == expected["moonStatus"]["until"]
    assert sky["moonEvent"]["name"] == expected["moonEvent"]["name"]
    assert sky["moonEvent"]["sign"] == expected["moonEvent"]["sign"]

    for point, expected_position in expected["positions"].items():
        actual = positions[point]
        assert actual["sign"] == expected_position["sign"]
        assert actual["house"] == expected_position["house"]
        assert actual["motion"] == expected_position["motion"]
        assert abs(actual["longitude"] - expected_position["longitude"]) < 0.01

    for expected_aspect in expected["aspects"]:
        actual_aspect = next(
            (
                aspect for aspect in sky["aspects"]
                if aspect["from"] == expected_aspect["from"]
                and aspect["to"] == expected_aspect["to"]
                and aspect["type"] == expected_aspect["type"]
            ),
            None,
        )
        assert actual_aspect is not None
        assert abs(actual_aspect["orb"] - expected_aspect["orb"]) < 0.05


def test_sky_current_uses_true_node_after_2026_aquarius_ingress():
    fixture_path = Path(__file__).parent / "fixtures" / "sky_current_new_york_2026_06_16.json"
    request = json.loads(fixture_path.read_text())["request"]
    request["datetime"]["date"] = "2026-07-29"

    response = client.post("/sky/current", json=request)

    assert response.status_code == 200
    north_node = next(
        position for position in response.json()["positions"]
        if position["point"] == "North Node"
    )
    assert north_node["sign"] == "Aquarius"
    assert 329 <= north_node["longitude"] < 330


def test_sky_current_returns_requested_complete_sign_residency_only():
    fixture_path = Path(__file__).parent / "fixtures" / "sky_current_new_york_2026_06_16.json"
    request = json.loads(fixture_path.read_text())["request"]
    request["datetime"]["date"] = "2026-08-22"
    request["datetime"]["utc"] = "2026-08-22T12:00:00.000Z"
    request["transitWindowPoints"] = ["saturn"]

    response = client.post("/sky/current", json=request)

    assert response.status_code == 200
    windows = response.json()["transitWindows"]
    assert set(windows) == {"Saturn"}
    assert windows["Saturn"]["transitStart"] == "2025-05-25T03:35:08+00:00"
    assert windows["Saturn"]["transitEnd"] == "2028-04-13T03:40:03+00:00"


def test_sky_current_uses_canonical_aspect_matrix_and_node_axis():
    fixture_path = Path(__file__).parent / "fixtures" / "sky_current_new_york_2026_06_16.json"
    request = json.loads(fixture_path.read_text())["request"]
    request["datetime"]["date"] = "2026-07-31"
    request["datetime"]["time"] = "12:00"

    response = client.post("/sky/current", json=request)

    assert response.status_code == 200
    sky = response.json()
    aspect_definitions = dict(canonical_sky_aspect_definitions())
    aspect_orbs = canonical_sky_aspect_orbs()
    actual_point_names = [position["point"] for position in sky["positions"]]
    expected_point_names = [
        point_name
        for point_name in canonical_sky_point_names()
        if point_name in actual_point_names
    ]
    assert actual_point_names == expected_point_names
    assert "South Node" in actual_point_names
    assert set(aspect_definitions) == {
        "conjunction",
        "sextile",
        "square",
        "trine",
        "quincunx",
        "opposition",
    }
    assert aspect_orbs == {
        "conjunction": 5.0,
        "sextile": 5.0,
        "square": 5.0,
        "trine": 5.0,
        "quincunx": 3.0,
        "opposition": 5.0,
    }

    node_names = {"North Node", "South Node"}
    node_contacts = {}
    for aspect in sky["aspects"]:
        assert aspect["type"] in aspect_definitions
        assert aspect["orb"] <= aspect_orbs[aspect["type"]]
        assert not ({aspect["from"], aspect["to"]} <= node_names)

        nodes = {aspect["from"], aspect["to"]} & node_names
        if nodes:
            other = aspect["to"] if aspect["from"] in node_names else aspect["from"]
            key = (other, aspect["type"])
            assert key not in node_contacts
            node_contacts[key] = next(iter(nodes))
