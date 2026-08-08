import json
from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.models import (
    ChartSettings,
    DateTimeInput,
    LocationInput,
    Position,
    SkyCurrentRequest,
)
from tldrastro_api.services.chart import _estimated_days_to_exact, julian_day_for
from tldrastro_api.services.sky import calculate_current_sky

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
        if actual["phase"] == "applying":
            assert actual["exactAt"] is not None

    applying_with_exactness = next(
        hit for hit in body["hits"]
        if hit["id"] == "jupiter-trine-pluto"
    )
    exact_at = datetime.fromisoformat(applying_with_exactness["exactAt"])
    generated_at = datetime.fromisoformat(body["transitChart"]["generatedAt"])
    assert exact_at > generated_at
    assert (exact_at - generated_at).days < 7

    separating = next(
        hit for hit in body["hits"]
        if hit["id"] == "saturn-sextile-midheaven"
    )
    assert separating["phase"] == "separating"
    assert separating["exactAt"] is None


def test_server_bisection_tracks_browser_saturn_pass_fixture_within_one_day():
    settings = ChartSettings()
    location = LocationInput(
        label="Greenwich",
        latitude=51.4769,
        longitude=0,
        timeZone="UTC",
    )
    natal_saturn = Position(
        point="Saturn",
        planet="Saturn",
        glyph="♄",
        longitude=1.5,
        sign="Aries",
        signGlyph="♈",
        degree=1,
        minute=30,
        degreeDecimal=1.5,
        retrograde=False,
        motion="direct",
        speed=0,
    )

    samples = [
        ("2025-06-18T12:00:00+00:00", "2025-06-20T08:36:26+00:00"),
        ("2025-07-15T12:00:00+00:00", "2025-08-05T01:39:03+00:00"),
    ]
    for reference, browser_exact_at in samples:
        sky = calculate_current_sky(
            SkyCurrentRequest(
                datetime=DateTimeInput(utc=reference, date=reference[:10], timeKnown=True),
                location=location,
                settings=settings,
                includeContentFacts=False,
            )
        )
        transit_saturn = next(position for position in sky.positions if position.point == "Saturn")
        reference_at = datetime.fromisoformat(sky.generatedAt)
        julian_day = julian_day_for(reference_at)
        days = _estimated_days_to_exact(
            transit_saturn,
            natal_saturn,
            0,
            julian_day,
            settings,
            move_first=True,
            move_second=False,
        )
        assert days is not None
        server_exact_at = reference_at.timestamp() + days * 86_400
        browser_exact_timestamp = datetime.fromisoformat(browser_exact_at).timestamp()
        assert abs(server_exact_at - browser_exact_timestamp) < 86_400
