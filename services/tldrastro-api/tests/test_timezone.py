from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_timezone_lookup_new_york_dst():
    response = client.post(
        "/utils/timezone",
        json={
            "latitude": 40.7128,
            "longitude": -74.006,
            "date": "1994-04-12",
            "time": "08:35",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["timeZone"] == "America/New_York"
    assert body["utcOffsetMinutes"] == -240
    assert body["isDst"] is True
    assert body["utcDateTime"].startswith("1994-04-12T12:35:00")
    assert body["source"] == "coordinates"


def test_timezone_lookup_pre_1970_standard_time():
    response = client.post(
        "/utils/timezone",
        json={
            "latitude": 34.0522,
            "longitude": -118.2437,
            "date": "1965-01-15",
            "time": "06:30",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["timeZone"] == "America/Los_Angeles"
    assert body["utcOffsetMinutes"] == -480
    assert body["isDst"] is False
    assert body["utcDateTime"].startswith("1965-01-15T14:30:00")


def test_timezone_lookup_accepts_explicit_timezone_override():
    response = client.post(
        "/utils/timezone",
        json={
            "latitude": 0,
            "longitude": 0,
            "date": "1994-04-12",
            "time": "08:35",
            "timeZone": "America/New_York",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["timeZone"] == "America/New_York"
    assert body["source"] == "request"

