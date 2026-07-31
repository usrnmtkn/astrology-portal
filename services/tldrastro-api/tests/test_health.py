from fastapi.testclient import TestClient

from tldrastro_api.main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["ephemeris"]["requestedEngine"] == "swiss"
    assert body["ephemeris"]["actualEngine"] in {"swiss", "jpl", "moshier"}
    assert len(body["ephemeris"]["checks"]) == 2


def test_ready():
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["ephemeris"]["available"] is True
    assert response.json()["ephemeris"]["ready"] is True


def test_ready_rejects_a_configured_engine_fallback(monkeypatch):
    monkeypatch.setattr(
        "tldrastro_api.routers.health.ephemeris_status",
        lambda _path: {
            "available": True,
            "ready": False,
            "requestedEngine": "swiss",
            "actualEngine": "moshier",
            "fallback": True,
            "degraded": True,
        },
    )

    response = client.get("/ready")

    assert response.status_code == 503
    detail = response.json()["details"]
    assert detail["ok"] is False
    assert detail["ephemeris"]["available"] is True
    assert detail["ephemeris"]["ready"] is False


def test_meta_status():
    response = client.get("/meta/status")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "tldrastro-api"
    assert body["version"]
    assert body["ephemeris"]["available"] is True
    assert "timing.personal" in [feature["id"] for feature in body["features"]]
    assert "allowedOrigins" in body["cors"]


def test_validation_error_contract():
    response = client.post("/chart/natal", json={})

    assert response.status_code == 422
    body = response.json()
    assert body["ok"] is False
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "Request validation failed."
    assert len(body["details"]["errors"]) > 0


def test_not_found_error_contract():
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["ok"] is False
    assert body["code"] == "NOT_FOUND"


def test_reference_config():
    response = client.get("/reference/config")

    assert response.status_code == 200
    body = response.json()
    assert "whole_sign" in [system["id"] for system in body["houseSystems"]]
    assert body["features"]["currentSky"] is True
    assert body["features"]["transits"] is True
    assert body["features"]["synastry"] is True
    assert body["features"]["composite"] is True
    assert body["features"]["timeLords"] is True
