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
    assert "whole_sign" in [system["id"] for system in response.json()["houseSystems"]]

