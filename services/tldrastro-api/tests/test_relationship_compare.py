import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_relationship_compare_fixture_maya_river():
    fixture_path = Path(__file__).parent / "fixtures" / "relationship_compare_maya_river.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/relationship/compare", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    expected = fixture["expected"]

    assert body["synastry"]["personA"]["subjectName"] == "Maya"
    assert body["synastry"]["personB"]["subjectName"] == "River"
    assert len(body["relationshipThemes"]) == expected["themeCount"]
    assert len(body["contentFacts"]) == expected["contentFactCount"]
    assert body["app"]["headline"] == expected["topThemes"][0]["label"]
    assert body["app"]["confidence"] >= 80
    assert body["app"]["relationshipTags"][:3] == [
        "relationship-compare",
        "synastry",
        "composite",
    ]
    assert body["app"]["keyFactors"][:3] == [
        theme["label"] for theme in expected["topThemes"][:3]
    ]
    assert body["synastry"]["app"]["relationshipTags"][0] == "synastry"
    assert body["composite"]["app"]["relationshipTags"][0] == "composite"

    for index, expected_theme in enumerate(expected["topThemes"]):
        actual = body["relationshipThemes"][index]
        assert actual["id"] == expected_theme["id"]
        assert actual["label"] == expected_theme["label"]
        assert actual["score"] == expected_theme["score"]
        assert actual["source"] == expected_theme["source"]

    for index, expected_fact in enumerate(expected["contentFacts"]):
        actual = body["contentFacts"][index]
        assert actual["eventType"] == expected_fact["eventType"]
        assert actual["headline"] == expected_fact["headline"]
        assert actual["priority"] == expected_fact["priority"]
