import sys

from tldrastro_api.services.ephemeris import (
    ephemeris_provenance,
    ephemeris_status,
    merge_ephemeris_provenance,
    start_ephemeris_trace,
    tracked_calc_ut,
)


class FakeSwiss:
    FLG_JPLEPH = 1
    FLG_SWIEPH = 2
    FLG_MOSEPH = 4
    FLG_SPEED = 256
    SUN = 0
    MOON = 1
    __version__ = "test-version"

    def __init__(self, returned_engine):
        self.returned_engine = returned_engine
        self.path = None

    def set_ephe_path(self, path):
        self.path = path

    def calc_ut(self, _julian_day, body_id, _flags):
        result = (100.0 + body_id, 0.0, 1.0, 0.5, 0.0, 0.0)
        return result, self.returned_engine | self.FLG_SPEED


def test_status_reports_unconfigured_moshier_as_degraded_but_usable(monkeypatch):
    fake = FakeSwiss(FakeSwiss.FLG_MOSEPH)
    monkeypatch.setitem(sys.modules, "swisseph", fake)

    status = ephemeris_status()

    assert status["available"] is True
    assert status["ready"] is True
    assert status["actualEngine"] == "moshier"
    assert status["fallback"] is True
    assert status["degraded"] is True
    assert status["pathConfigured"] is False


def test_status_rejects_moshier_when_a_swiss_path_is_configured(monkeypatch, tmp_path):
    fake = FakeSwiss(FakeSwiss.FLG_MOSEPH)
    monkeypatch.setitem(sys.modules, "swisseph", fake)

    status = ephemeris_status(str(tmp_path))

    assert status["available"] is True
    assert status["ready"] is False
    assert status["actualEngine"] == "moshier"
    assert status["pathAvailable"] is True


def test_status_accepts_swiss_when_the_configured_path_is_used(monkeypatch, tmp_path):
    fake = FakeSwiss(FakeSwiss.FLG_SWIEPH)
    monkeypatch.setitem(sys.modules, "swisseph", fake)

    status = ephemeris_status(str(tmp_path))

    assert status["available"] is True
    assert status["ready"] is True
    assert status["actualEngine"] == "swiss"
    assert status["fallback"] is False
    assert fake.path == str(tmp_path)


def test_calculation_trace_records_the_engine_returned_by_calc_ut():
    fake = FakeSwiss(FakeSwiss.FLG_MOSEPH)
    start_ephemeris_trace("/configured/swisseph")

    tracked_calc_ut(fake, 2451545.0, fake.SUN, fake.FLG_SWIEPH | fake.FLG_SPEED)
    provenance = ephemeris_provenance(fake)

    assert provenance["requestedEngine"] == "swiss"
    assert provenance["actualEngine"] == "moshier"
    assert provenance["fallback"] is True
    assert provenance["dataPath"] == "/configured/swisseph"
    assert provenance["calculations"] == 1


def test_merge_provenance_preserves_all_engines_and_calculation_counts():
    merged = merge_ephemeris_provenance(
        {
            "library": "pyswisseph",
            "libraryVersion": "1",
            "requestedEngine": "swiss",
            "actualEngine": "swiss",
            "actualEngines": ["swiss"],
            "fallback": False,
            "dataPath": "/ephe",
            "returnedFlags": [258],
            "calculations": 4,
        },
        {
            "library": "pyswisseph",
            "libraryVersion": "1",
            "requestedEngine": "swiss",
            "actualEngine": "moshier",
            "actualEngines": ["moshier"],
            "fallback": True,
            "dataPath": "/ephe",
            "returnedFlags": [260],
            "calculations": 3,
        },
    )

    assert merged is not None
    assert merged["actualEngine"] == "mixed"
    assert merged["actualEngines"] == ["moshier", "swiss"]
    assert merged["fallback"] is True
    assert merged["returnedFlags"] == [258, 260]
    assert merged["calculations"] == 7
