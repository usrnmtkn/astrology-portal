import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.services.composite import midpoint_longitude

client = TestClient(app)


def test_midpoint_longitude_crosses_zero_aries():
    assert midpoint_longitude(350, 10) == 0
    assert midpoint_longitude(10, 350) == 0
    assert midpoint_longitude(355, 5) == 0


def test_composite_fixture_maya_river(assert_known_ephemeris_profile):
    fixture_path = Path(__file__).parent / "fixtures" / "composite_maya_river.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/relationship/composite", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    assert_known_ephemeris_profile(body["metadata"])
    expected = fixture["expected"]
    positions = {position["point"]: position for position in body["positions"]}

    assert len(body["positions"]) == expected["positionCount"]
    assert len(body["aspects"]) == expected["aspectCount"]
    assert len(body["contentFacts"]) == expected["contentFactCount"]
    for point, expected_position in expected["positions"].items():
        actual = positions[point]
        assert actual["sign"] == expected_position["sign"]
        assert actual["house"] == expected_position["house"]
        assert abs(actual["longitude"] - expected_position["longitude"]) < 0.01

    for index, expected_aspect in enumerate(expected["topAspects"]):
        actual = body["aspects"][index]
        assert actual["from"] == expected_aspect["from"]
        assert actual["type"] == expected_aspect["type"]
        assert actual["to"] == expected_aspect["to"]
        assert abs(actual["orb"] - expected_aspect["orb"]) < 0.05
        assert actual["strength"] == expected_aspect["strength"]
