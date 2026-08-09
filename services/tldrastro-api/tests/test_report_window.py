import json
from datetime import date
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.services.report_window import _is_return

client = TestClient(app)
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "marie_report_2026.json").read_text())


def _within_day(actual: str, expected: str) -> bool:
    return abs((date.fromisoformat(actual[:10]) - date.fromisoformat(expected)).days) <= 1


def test_report_window_reproduces_owner_transit_and_eclipse_contract():
    response = client.post(
        "/timing/report-window",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "location": FIXTURE["returnLocation"],
            **FIXTURE["window"],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    arcs = {
        (arc["transitPlanet"], arc["natalPoint"], arc["aspect"]): arc
        for arc in body["slowTransitArcs"]
    }
    expected = {
        ("Saturn", "Jupiter", "trine"): ["2026-02-22"],
        ("Neptune", "Jupiter", "trine"): ["2026-02-26"],
        ("Uranus", "Sun", "square"): ["2026-04-14"],
        ("Jupiter", "Pluto", "square"): ["2026-05-01"],
        ("Jupiter", "Uranus", "trine"): ["2026-05-14"],
        ("Saturn", "Ascendant", "sextile"): [
            "2026-05-19",
            "2026-10-06",
            "2027-02-10",
        ],
        ("Jupiter", "Jupiter", "conjunction"): ["2026-07-04"],
        ("Jupiter", "Moon", "square"): ["2026-08-27"],
        ("Jupiter", "Midheaven", "opposition"): ["2026-09-15"],
        ("Jupiter", "Pluto", "sextile"): ["2026-09-27"],
        ("Jupiter", "Neptune", "trine"): ["2026-10-04"],
        ("Jupiter", "Uranus", "square"): ["2026-10-09"],
        ("Jupiter", "Mars", "opposition"): ["2026-10-20", "2027-02-05"],
    }
    for key, dates in expected.items():
        assert key in arcs
        arc = arcs[key]
        assert arc["passCount"] == len(dates)
        assert len(arc["passes"]) == len(dates)
        assert all(report_pass["exactAt"] for report_pass in arc["passes"])
        assert all(
            _within_day(report_pass["exactAt"], expected_date)
            for report_pass, expected_date in zip(arc["passes"], dates)
        )

    assert arcs[("Jupiter", "Jupiter", "conjunction")]["isReturn"] is True
    saturn_passes = arcs[("Saturn", "Ascendant", "sextile")]["passes"]
    assert [report_pass["motion"] for report_pass in saturn_passes] == [
        "direct",
        "retrograde",
        "direct",
    ]

    eclipses = {
        event["occursAt"][:10]: event for event in body["lunarEvents"] if "eclipse" in event["kind"]
    }
    for expected_date in ("2026-03-03", "2026-08-12", "2026-08-28", "2027-02-06"):
        assert expected_date in eclipses
    assert any(
        contact["natalPoint"] == "Saturn" for contact in eclipses["2026-03-03"]["natalContacts"]
    )
    assert any(
        contact["natalPoint"] == "Uranus" for contact in eclipses["2026-08-12"]["natalContacts"]
    )
    assert any(
        contact["natalPoint"] == "Mercury" for contact in eclipses["2026-08-28"]["natalContacts"]
    )
    assert any(
        contact["natalPoint"] == "Midheaven" for contact in eclipses["2027-02-06"]["natalContacts"]
    )


def test_neptune_and_pluto_self_conjunctions_are_not_returns():
    assert _is_return("Neptune", "Neptune", "conjunction") is False
    assert _is_return("Pluto", "Pluto", "conjunction") is False
    assert _is_return("Jupiter", "Jupiter", "conjunction") is True
