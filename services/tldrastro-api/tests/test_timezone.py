from fastapi.testclient import TestClient

from tldrastro_api.config import get_settings
from tldrastro_api.main import app
from tldrastro_api.services import timezone as timezone_service


client = TestClient(app)


class _MockGoogleResponse:
    def __init__(self, payload: bytes):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self.payload


def test_timezonefinder_instance_is_reused():
    timezone_service._timezone_finder.cache_clear()

    first = timezone_service._timezone_finder()
    second = timezone_service._timezone_finder()

    assert second is first
    assert timezone_service._timezone_finder.cache_info().hits == 1


def test_coordinate_results_are_reused(monkeypatch):
    calls = {"lookup": 0}

    class _MockFinder:
        def timezone_at(self, *, lat, lng):
            calls["lookup"] += 1
            assert lat == 40.7128
            assert lng == -74.006
            return "America/New_York"

        def closest_timezone_at(self, *, lat, lng):
            raise AssertionError(f"Unexpected closest lookup for {lat}, {lng}")

    timezone_service.timezone_at.cache_clear()
    monkeypatch.setattr(timezone_service, "_timezone_finder", lambda: _MockFinder())

    assert timezone_service.timezone_at(40.7128, -74.006) == "America/New_York"
    assert timezone_service.timezone_at(40.7128, -74.006) == "America/New_York"
    assert calls == {"lookup": 1}

    timezone_service.timezone_at.cache_clear()


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


def test_timezone_lookup_uses_google_when_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_MAPS_TIMEZONE_API_KEY", "test-google-key")
    get_settings.cache_clear()

    def mock_urlopen(url, timeout):
        assert "maps.googleapis.com/maps/api/timezone/json" in url
        assert "location=8.633333%2C-71.65" in url
        assert "key=test-google-key" in url
        assert timeout == 6
        return _MockGoogleResponse(b'{"status":"OK","timeZoneId":"America/Caracas"}')

    monkeypatch.setattr(timezone_service, "urlopen", mock_urlopen)

    response = client.post(
        "/utils/timezone",
        json={
            "latitude": 8.633333,
            "longitude": -71.65,
            "date": "1979-02-08",
            "time": "09:00",
        },
    )

    get_settings.cache_clear()

    assert response.status_code == 200
    body = response.json()
    assert body["timeZone"] == "America/Caracas"
    assert body["utcOffsetMinutes"] == -240
    assert body["source"] == "google"


def test_timezone_lookup_falls_back_to_timezonefinder_when_google_fails(monkeypatch):
    monkeypatch.setenv("GOOGLE_MAPS_TIMEZONE_API_KEY", "test-google-key")
    get_settings.cache_clear()

    def mock_urlopen(_url, _timeout):
        raise RuntimeError("Google is unavailable")

    monkeypatch.setattr(timezone_service, "urlopen", mock_urlopen)

    response = client.post(
        "/utils/timezone",
        json={
            "latitude": 8.633333,
            "longitude": -71.65,
            "date": "1979-02-08",
            "time": "09:00",
        },
    )

    get_settings.cache_clear()

    assert response.status_code == 200
    body = response.json()
    assert body["timeZone"] == "America/Caracas"
    assert body["source"] == "coordinates"
    assert any("Google timezone lookup failed" in warning for warning in body["warnings"])
