import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.services.report_window import _is_return

client = TestClient(app)
FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "synthetic_report_2026.json").read_text())


def test_report_window_reproduces_production_transit_and_eclipse_contract():
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
        ("Saturn", "Sun", "square"): ["2026-05-18", "2026-10-08", "2027-02-09"],
        ("Saturn", "Midheaven", "square"): ["2026-05-19", "2026-10-06", "2027-02-10"],
        ("Jupiter", "Saturn", "opposition"): ["2026-02-20", "2026-03-30"],
        ("Jupiter", "Venus", "opposition"): ["2026-07-28"],
        ("Jupiter", "North Node", "opposition"): ["2026-09-16"],
    }
    for key, dates in expected.items():
        assert key in arcs
        arc = arcs[key]
        assert arc["passCount"] == len(dates)
        assert len(arc["passes"]) == len(dates)
        assert all(report_pass["exactAt"] for report_pass in arc["passes"])
        assert [report_pass["exactAt"][:10] for report_pass in arc["passes"]] == dates

    assert all(arc["isReturn"] is False for arc in arcs.values())
    saturn_passes = arcs[("Saturn", "Sun", "square")]["passes"]
    assert [report_pass["motion"] for report_pass in saturn_passes] == [
        "direct",
        "retrograde",
        "direct",
    ]
    jupiter_saturn_passes = arcs[("Jupiter", "Saturn", "opposition")]["passes"]
    assert [report_pass["motion"] for report_pass in jupiter_saturn_passes] == [
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
        contact["natalPoint"] == "Pluto" for contact in eclipses["2026-08-12"]["natalContacts"]
    )
    assert any(
        contact["natalPoint"] == "Moon" for contact in eclipses["2026-08-28"]["natalContacts"]
    )
    assert any(
        contact["natalPoint"] == "Ascendant" for contact in eclipses["2027-02-06"]["natalContacts"]
    )
    assert {
        event_date: (event["subtype"], event["natalHouse"])
        for event_date, event in eclipses.items()
        if event_date in {"2026-03-03", "2026-08-12", "2026-08-28", "2027-02-06"}
    } == {
        "2026-03-03": ("total", 6),
        "2026-08-12": ("total", 5),
        "2026-08-28": ("partial", 12),
        "2027-02-06": ("annular", 11),
    }
    assert next(
        contact for contact in eclipses["2026-03-03"]["natalContacts"]
        if contact["natalPoint"] == "Saturn"
    )["natalHouse"] == 10


def test_neptune_and_pluto_self_conjunctions_are_not_returns():
    assert _is_return("Neptune", "Neptune", "conjunction") is False
    assert _is_return("Pluto", "Pluto", "conjunction") is False
    assert _is_return("Jupiter", "Jupiter", "conjunction") is True
