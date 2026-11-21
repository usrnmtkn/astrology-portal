import json
from pathlib import Path

from fastapi.testclient import TestClient

from tldrastro_api.main import app
from tldrastro_api.models import ChartSubject, NatalChartResponse
from tldrastro_api.services.chart import resolve_datetime
from tldrastro_api.services.natal import canonical_natal_provenance
from tldrastro_api.services.report_window import _is_return

client = TestClient(app)
FIXTURE = json.loads(
    (Path(__file__).parent / "fixtures" / "synthetic_report_2026.json").read_text()
)


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
    assert body["natal"]["metadata"]["chartProvenance"]["schemaVersion"] == "canonical-natal-v2"
    assert body["natal"]["metadata"]["chartProvenance"]["provenanceHash"]
    assert body["natal"]["metadata"]["ephemeris"]["requestedEngine"] == "swiss"
    changed_source = json.loads(json.dumps(FIXTURE["natalSubject"]))
    changed_source["location"]["coordinateSource"]["sourceId"] = "different-centroid-record"
    changed = client.post(
        "/chart/natal", json={"subject": changed_source, "includeContentFacts": False}
    )
    assert changed.status_code == 200
    assert (
        changed.json()["metadata"]["chartProvenance"]["provenanceHash"]
        != body["natal"]["metadata"]["chartProvenance"]["provenanceHash"]
    )
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
    assert (
        next(
            contact
            for contact in eclipses["2026-03-03"]["natalContacts"]
            if contact["natalPoint"] == "Saturn"
        )["natalHouse"]
        == 10
    )


def test_natal_provenance_hashes_canonical_report_values_not_platform_float_noise():
    response = client.post(
        "/chart/natal",
        json={"subject": FIXTURE["natalSubject"], "includeContentFacts": False},
    )
    assert response.status_code == 200, response.text
    subject = ChartSubject.model_validate(FIXTURE["natalSubject"])
    utc_datetime = resolve_datetime(subject, [], "Birth time is unknown.")
    natal = NatalChartResponse.model_validate(response.json())
    original = natal.metadata.chartProvenance
    assert original is not None
    assert natal.metadata.ephemeris is not None
    assert natal.metadata.ephemeris.actualEngine == "swiss"
    assert original.inputHash == "7b87743a43b044a39423999af5427fc435b939e41096a33f1fccc4feecb27f77"
    assert original.resultHash == "a6849716003afe171049473a4912f4133d4b2145ee223b5301fa913fe3d75731"
    assert original.provenanceHash == "1f96fb4a3183d2f8c1e2749d05c9af8a08d565d999940f72c03ac38659573944"

    platform_drift = natal.model_copy(deep=True)
    platform_drift.positions[0].longitude += 0.00000001
    platform_drift.positions[0].degreeDecimal += 0.00000001
    if platform_drift.positions[0].speed is not None:
        platform_drift.positions[0].speed += 0.00000001
    if platform_drift.positions[0].declination is not None:
        platform_drift.positions[0].declination += 0.00000001
    platform_drift.houseCusps[0] += 0.00000001
    platform_drift.aspects[0].orb += 0.00000001
    normalized = canonical_natal_provenance(platform_drift, utc_datetime, subject)
    assert normalized.resultHash == original.resultHash
    assert normalized.provenanceHash == original.provenanceHash

    visible_change = natal.model_copy(deep=True)
    visible_change.positions[0].minute += 1
    changed = canonical_natal_provenance(visible_change, utc_datetime, subject)
    assert changed.resultHash != original.resultHash
    assert changed.provenanceHash != original.provenanceHash


def test_neptune_and_pluto_self_conjunctions_are_not_returns():
    assert _is_return("Neptune", "Neptune", "conjunction") is False
    assert _is_return("Pluto", "Pluto", "conjunction") is False
    assert _is_return("Jupiter", "Jupiter", "conjunction") is True


def test_report_window_rejects_unprovenanced_cached_angle_overrides():
    response = client.post(
        "/timing/report-window",
        json={
            "natalSubject": FIXTURE["natalSubject"],
            "location": FIXTURE["returnLocation"],
            **FIXTURE["window"],
            "natalPointLongitudes": {"Ascendant": 71.15, "Midheaven": 316.6},
        },
    )
    assert response.status_code == 422
    assert "natalPointLongitudes" in response.text
