from fastapi.testclient import TestClient

from tldrastro_api.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_reference_config():
    response = client.get("/reference/config")

    assert response.status_code == 200
    body = response.json()
    assert "whole_sign" in [system["id"] for system in body["houseSystems"]]
    assert body["features"]["currentSky"] is True
    assert body["features"]["transits"] is True
