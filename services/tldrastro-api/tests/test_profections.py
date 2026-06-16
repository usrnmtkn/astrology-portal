import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_profections_fixture_maya_2026_06_16():
    fixture_path = Path(__file__).parent / "fixtures" / "profections_maya_2026_06_16.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/timing/profections", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    expected = fixture["expected"]

    assert body["age"] == expected["age"]
    assert body["natal"]["subjectName"] == "Maya"
    assert body["annual"]["level"] == "annual"
    assert body["annual"]["house"] == expected["annual"]["house"]
    assert body["annual"]["sign"] == expected["annual"]["sign"]
    assert body["annual"]["ruler"] == expected["annual"]["ruler"]
    assert body["annual"]["startsAt"] == expected["annual"]["startsAt"]
    assert body["annual"]["endsAt"] == expected["annual"]["endsAt"]
    assert body["annual"]["activatedNatalPlanets"] == expected["annual"]["activatedNatalPlanets"]
    assert body["monthly"]["level"] == "monthly"
    assert body["monthly"]["house"] == expected["monthly"]["house"]
    assert body["monthly"]["sign"] == expected["monthly"]["sign"]
    assert body["monthly"]["ruler"] == expected["monthly"]["ruler"]
    assert body["monthly"]["startsAt"] == expected["monthly"]["startsAt"]
    assert body["monthly"]["endsAt"] == expected["monthly"]["endsAt"]
    assert body["monthly"]["activatedNatalPlanets"] == expected["monthly"]["activatedNatalPlanets"]


def test_profections_respect_house_system_warns():
    fixture_path = Path(__file__).parent / "fixtures" / "profections_maya_2026_06_16.json"
    payload = json.loads(fixture_path.read_text())["request"]
    payload["respectHouseSystem"] = True

    response = client.post("/timing/profections", json=payload)

    assert response.status_code == 200
    warnings = response.json()["metadata"]["inputWarnings"]
    assert any("pinned to whole-sign" in warning for warning in warnings)

