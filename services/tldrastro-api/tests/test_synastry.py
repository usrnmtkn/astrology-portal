import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app

client = TestClient(app)


def test_synastry_fixture_maya_river(assert_known_ephemeris_profile):
    fixture_path = Path(__file__).parent / "fixtures" / "synastry_maya_river.json"
    fixture = json.loads(fixture_path.read_text())

    response = client.post("/relationship/synastry", json=fixture["request"])

    assert response.status_code == 200
    body = response.json()
    assert_known_ephemeris_profile(body["metadata"])
    expected = fixture["expected"]

    assert body["metadata"]["houseSystem"] == "whole_sign"
    assert body["metadata"]["zodiac"] == "tropical"
    assert body["personA"]["subjectName"] == "Maya"
    assert body["personB"]["subjectName"] == "River"
    assert len(body["contacts"]) == expected["contactCount"]
    assert len(body["houseOverlays"]) == expected["overlayCount"]

    for index, expected_contact in enumerate(expected["topContacts"]):
        actual = body["contacts"][index]
        assert actual["id"] == expected_contact["id"]
        assert actual["fromPerson"] == expected_contact["fromPerson"]
        assert actual["fromPoint"] == expected_contact["fromPoint"]
        assert actual["aspect"] == expected_contact["aspect"]
        assert actual["toPerson"] == expected_contact["toPerson"]
        assert actual["toPoint"] == expected_contact["toPoint"]
        assert abs(actual["orb"] - expected_contact["orb"]) < 0.05
        assert actual["score"] == expected_contact["score"]
        assert actual["knowledgeIds"][0].startswith("synastry-")

    overlays = {overlay["id"]: overlay for overlay in body["houseOverlays"]}
    for expected_overlay in expected["overlays"]:
        actual = overlays[expected_overlay["id"]]
        assert actual["planetOwner"] == expected_overlay["planetOwner"]
        assert actual["point"] == expected_overlay["point"]
        assert actual["houseOwner"] == expected_overlay["houseOwner"]
        assert actual["house"] == expected_overlay["house"]
