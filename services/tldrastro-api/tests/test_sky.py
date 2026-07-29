import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


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
