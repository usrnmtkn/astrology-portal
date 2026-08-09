import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app

client = TestClient(app)
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "marie_report_2026.json").read_text())


def _utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _within_minutes(actual: str, expected: str, minutes: int = 2) -> bool:
    return abs((_utc(actual) - _utc(expected)).total_seconds()) <= minutes * 60


def test_solar_return_reproduces_owner_calculation_contract():
    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "targetDate": "2026-02-18",
            "returnLocation": FIXTURE["returnLocation"],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert _within_minutes(body["returnMoment"], "2026-02-18T01:59:00Z")
    venus = next(
        position for position in body["chart"]["positions"] if position["point"] == "Venus"
    )
    assert (venus["sign"], venus["degree"], venus["minute"]) == ("Pisces", 9, 35)
    venus_overlay = next(
        overlay
        for overlay in body["analysis"]["solarReturnToNatalOverlays"]
        if overlay["point"] == "Venus"
    )
    assert venus_overlay["house"] == 10
    ascendant = body["chart"]["angles"]["Ascendant"]
    assert ascendant["sign"] == "Libra"
    assert abs(ascendant["degreeDecimal"] - 11.0) <= 0.1
    assert 180 <= ascendant["longitude"] < 210


def test_next_solar_return_reproduces_owner_calculation_contract():
    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "targetDate": "2027-02-18",
            "returnLocation": FIXTURE["returnLocation"],
        },
    )

    assert response.status_code == 200, response.text
    assert _within_minutes(response.json()["returnMoment"], "2027-02-18T07:40:00Z")
