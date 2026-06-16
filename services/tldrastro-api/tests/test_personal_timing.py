import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_personal_timing_fixture_maya_2026_06_16():
    fixture_path = Path(__file__).parent / "fixtures" / "personal_timing_maya_2026_06_16.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/timing/personal", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    expected = fixture["expected"]

    assert body["activatedHouse"] == expected["activatedHouse"]
    assert body["activatedSign"] == expected["activatedSign"]
    assert body["activatedRuler"] == expected["activatedRuler"]
    assert body["natal"]["subjectName"] == "Maya"
    assert body["currentSky"]["generatedAt"] == "2026-06-16T16:00:00+00:00"
    assert body["profections"]["annual"]["sign"] == expected["activatedSign"]
    assert len(body["topTransits"]) == fixture["request"]["maxTransits"]

    top_transit = body["topTransits"][0]
    assert top_transit["id"] == expected["topTransit"]["id"]
    assert top_transit["score"] == expected["topTransit"]["score"]

    top_boosted = body["timingBoostedTransits"][0]
    assert top_boosted["hit"]["id"] == expected["topBoostedTransit"]["id"]
    assert top_boosted["baseScore"] == expected["topBoostedTransit"]["baseScore"]
    assert top_boosted["boostedScore"] == expected["topBoostedTransit"]["boostedScore"]
    assert top_boosted["boostReasons"] == expected["topBoostedTransit"]["boostReasons"]

    assert [
        {
            "eventType": fact["eventType"],
            "headline": fact["headline"],
        }
        for fact in body["contentFacts"]
    ] == expected["contentFacts"]

