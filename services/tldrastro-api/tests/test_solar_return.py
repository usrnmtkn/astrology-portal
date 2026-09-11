import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app

client = TestClient(app)
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "synthetic_report_2026.json").read_text())


def _utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _within_minutes(actual: str, expected: str, minutes: int = 2) -> bool:
    return abs((_utc(actual) - _utc(expected)).total_seconds()) <= minutes * 60


def test_solar_return_reproduces_synthetic_calculation_contract():
    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "targetDate": "2026-01-01",
            "returnLocation": FIXTURE["returnLocation"],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert _within_minutes(body["returnMoment"], "2026-01-01T10:47:24Z")
    venus = next(
        position for position in body["chart"]["positions"] if position["point"] == "Venus"
    )
    assert (venus["sign"], venus["degree"], venus["minute"]) == ("Capricorn", 9, 46)
    venus_overlay = next(
        overlay
        for overlay in body["analysis"]["solarReturnToNatalOverlays"]
        if overlay["point"] == "Venus"
    )
    assert venus_overlay["house"] == 10
    ascendant = body["chart"]["angles"]["Ascendant"]
    assert ascendant["sign"] == "Sagittarius"
    assert abs(ascendant["degreeDecimal"] - 18.579199) <= 0.1
    assert 240 <= ascendant["longitude"] < 270


def test_next_solar_return_reproduces_synthetic_calculation_contract():
    response = client.post(
        "/timing/solar-return",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "targetDate": "2027-01-01",
            "returnLocation": FIXTURE["returnLocation"],
        },
    )

    assert response.status_code == 200, response.text
    assert _within_minutes(response.json()["returnMoment"], "2027-01-01T16:37:44Z")


def test_synthetic_return_matches_direct_ephemeris_on_two_years():
    import swisseph as swe
    natal_sun = swe.calc_ut(swe.julday(1990, 1, 1, 17), swe.SUN)[0][0]
    for year in (2026, 2027):
        response = client.post('/timing/solar-return', json={
            'natalSubject': FIXTURE['natalSubject'], 'targetDate': f'{year}-01-01',
            'returnLocation': FIXTURE['returnLocation'],
        })
        assert response.status_code == 200
        moment = _utc(response.json()['returnMoment'])
        jd = swe.julday(moment.year, moment.month, moment.day, moment.hour + moment.minute / 60 + moment.second / 3600)
        return_sun = swe.calc_ut(jd, swe.SUN)[0][0]
        assert abs((return_sun - natal_sun + 180) % 360 - 180) < 0.0001
