import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_transits_fixture_maya_2026_06_16():
    fixture_path = Path(__file__).parent / "fixtures" / "transits_maya_2026_06_16.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/chart/transits", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    expected = fixture["expected"]

    assert body["metadata"]["houseSystem"] == expected["houseSystem"]
    assert body["metadata"]["zodiac"] == expected["zodiac"]
    assert body["natal"]["subjectName"] == "Maya"
    assert body["transitChart"]["generatedAt"] == "2026-06-16T16:00:00+00:00"
    assert len(body["hits"]) >= len(expected["topHits"])

    for index, expected_hit in enumerate(expected["topHits"]):
        actual = body["hits"][index]
        assert actual["id"] == expected_hit["id"]
        assert actual["transitPlanet"] == expected_hit["transitPlanet"]
        assert actual["aspect"] == expected_hit["aspect"]
        assert actual["natalPoint"] == expected_hit["natalPoint"]
        assert actual["phase"] == expected_hit["phase"]
        assert actual["transitHouse"] == expected_hit["transitHouse"]
        assert actual["natalHouse"] == expected_hit["natalHouse"]
        assert abs(actual["orb"] - expected_hit["orb"]) < 0.05
        assert actual["score"] > 0
        assert actual["strength"] >= 0
        assert actual["knowledgeIds"][0].startswith("transit-natal-")

