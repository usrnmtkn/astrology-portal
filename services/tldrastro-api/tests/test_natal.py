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
    assert "True Node" in positions
    assert positions["Sun"]["sign"] == "Aries"
    assert isinstance(chart["aspects"], list)


def test_natal_chart_accepts_placidus():
    response = client.post("/chart/natal", json=natal_payload("placidus"))

    assert response.status_code == 200
    chart = response.json()

    assert chart["metadata"]["houseSystem"] == "placidus"
    assert len(chart["houseCusps"]) == 12


def test_natal_chart_unknown_birth_time_warns():
    payload = natal_payload()
    payload["subject"]["datetime"]["timeKnown"] = False
    payload["subject"]["datetime"]["time"] = None

    response = client.post("/chart/natal", json=payload)

    assert response.status_code == 200
    warnings = response.json()["metadata"]["inputWarnings"]
    assert any("Birth time is unknown" in warning for warning in warnings)

