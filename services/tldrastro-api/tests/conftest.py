import os
from importlib.metadata import version

import pytest

PINNED_PYSWISSEPH_VERSION = "2.10.3.2"
PORTABLE_EPHEMERIS_PROFILE = ["moshier", "swiss"]


def _expected_engines():
    configured = os.getenv("TLDR_ASTRO_TEST_EPHEMERIS_ENGINES")
    if not configured:
        return PORTABLE_EPHEMERIS_PROFILE
    return sorted(engine.strip() for engine in configured.split(",") if engine.strip())


@pytest.fixture
def assert_known_ephemeris_profile():
    def assert_profile(metadata):
        provenance = metadata["ephemeris"]
        expected_engines = _expected_engines()

        assert version("pyswisseph") == PINNED_PYSWISSEPH_VERSION
        assert provenance["actualEngines"] == expected_engines
        assert provenance["actualEngine"] == (
            expected_engines[0] if len(expected_engines) == 1 else "mixed"
        )
        assert provenance["fallback"] is (expected_engines != ["swiss"])

    return assert_profile
