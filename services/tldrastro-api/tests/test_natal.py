import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def natal_payload(house_system="whole_sign"):
    return {
        "subject": {
            "name": "Maya",
            "datetime": {
                "date": "1994-04-12",
                "time": "08:35",
                "timeKnown": True,
                "timeZone": "America/New_York",
            },
            "location": {
                "label": "New York, NY",
                "latitude": 40.7128,
                "longitude": -74.006,
                "timeZone": "America/New_York",
            },
            "settings": {
                "houseSystem": house_system,
                "zodiac": "tropical",
                "aspectProfile": "standard",
            },
        },
        "includeContentFacts": True,
    }


def test_natal_chart_returns_core_chart_shape():
    response = client.post("/chart/natal", json=natal_payload())

    assert response.status_code == 200
    chart = response.json()
    positions = {position["point"]: position for position in chart["positions"]}

    assert chart["metadata"]["houseSystem"] == "whole_sign"
    assert chart["metadata"]["zodiac"] == "tropical"
    assert chart["subjectName"] == "Maya"
    assert len(chart["houseCusps"]) == 12
    assert "Ascendant" in chart["angles"]
    assert "Midheaven" in chart["angles"]
    assert "Sun" in positions
    assert "Moon" in positions
    assert "North Node" in positions
    assert positions["Sun"]["sign"] == "Aries"
    assert isinstance(chart["aspects"], list)


def test_natal_chart_unknown_birth_time_warns():
    payload = natal_payload()
    payload["subject"]["datetime"]["timeKnown"] = False
    payload["subject"]["datetime"]["time"] = None

    response = client.post("/chart/natal", json=payload)

    assert response.status_code == 200
    warnings = response.json()["metadata"]["inputWarnings"]
    assert any("Birth time is unknown" in warning for warning in warnings)


def test_natal_fixture_maya_whole_sign():
    fixture_path = Path(__file__).parent / "fixtures" / "natal_maya_whole_sign.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/chart/natal", json=fixture["request"])

    assert response.status_code == 200
    chart = response.json()
    expected = fixture["expected"]
    positions = {position["point"]: position for position in chart["positions"]}
    angles = chart["angles"]

    assert chart["metadata"]["houseSystem"] == expected["houseSystem"]
    assert chart["metadata"]["zodiac"] == expected["zodiac"]

    for point, expected_position in expected["positions"].items():
        actual = positions[point]
        assert actual["sign"] == expected_position["sign"]
        assert actual["house"] == expected_position["house"]
        assert actual["motion"] == expected_position["motion"]
        assert abs(actual["longitude"] - expected_position["longitude"]) < 0.01

    for angle, expected_angle in expected["angles"].items():
        actual = angles[angle]
        assert actual["sign"] == expected_angle["sign"]
        assert abs(actual["longitude"] - expected_angle["longitude"]) < 0.01

    for expected_aspect in expected["aspects"]:
        actual_aspect = next(
            (
                aspect for aspect in chart["aspects"]
                if aspect["from"] == expected_aspect["from"]
                and aspect["to"] == expected_aspect["to"]
                and aspect["type"] == expected_aspect["type"]
            ),
            None,
        )
        assert actual_aspect is not None
        assert abs(actual_aspect["orb"] - expected_aspect["orb"]) < 0.05
