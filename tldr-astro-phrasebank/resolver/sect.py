"""
sect.py
-------
Day-chart vs night-chart logic, kept as a SEPARATE decision from transit ranking.

From the correction note:
  * Day chart : Sun is the sect light; Jupiter and Saturn are its sect team.
  * Night chart: Moon is the sect light; Venus and Mars are its sect team.
  * Mercury's sect must be CALCULATED, not guessed.
  * Sect-dependent reader copy must be SUPPRESSED without reliable birth time /
    horizon data.

Two decisions that must never be conflated:
  * Natal placement interpretation -> MAY use eligible day/night sect content.
  * Transit ranking -> sect weighting is EXPERIMENTAL; do NOT enable it
    automatically (requires tests + product approval).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Sect(str, Enum):
    DAY = "day"
    NIGHT = "night"


# Sect teams (the two benefic/malefic pairs that share the light's sect).
DAY_TEAM = {"sun", "jupiter", "saturn"}
NIGHT_TEAM = {"moon", "venus", "mars"}


@dataclass
class BirthData:
    """Minimal inputs needed to decide sect eligibility."""
    has_birth_time: bool = False
    has_horizon: bool = False           # ascendant / horizon known
    sun_above_horizon: Optional[bool] = None   # True = Sun above => day chart
    # Mercury sect is derived from whether Mercury rises before or after the Sun
    mercury_rises_before_sun: Optional[bool] = None


def sect_eligible(birth: BirthData) -> bool:
    """
    Sect-dependent copy is eligible ONLY when we have reliable birth time and a
    known horizon. Otherwise suppress. This is the gate the resolver checks
    before it will emit any 'day/night sect when eligible' modifier.
    """
    return bool(birth.has_birth_time and birth.has_horizon and birth.sun_above_horizon is not None)


def chart_sect(birth: BirthData) -> Optional[Sect]:
    if not sect_eligible(birth):
        return None
    return Sect.DAY if birth.sun_above_horizon else Sect.NIGHT


def sect_light(birth: BirthData) -> Optional[str]:
    s = chart_sect(birth)
    if s is None:
        return None
    return "sun" if s is Sect.DAY else "moon"


def mercury_sect(birth: BirthData) -> Optional[Sect]:
    """
    Mercury is calculated, never guessed. Mercury takes the sect of the
    hemisphere it occupies relative to the Sun: if it rises before the Sun it is
    a morning ('day') star; if after, an evening ('night') star.
    Returns None when we lack the data to compute it.
    """
    if not sect_eligible(birth):
        return None
    if birth.mercury_rises_before_sun is None:
        return None
    return Sect.DAY if birth.mercury_rises_before_sun else Sect.NIGHT


def body_in_sect(body: str, birth: BirthData) -> Optional[bool]:
    """
    Is `body` in-sect (favored) for this chart? None means undecidable ->
    suppress any in-sect / out-of-sect reader copy.
    """
    s = chart_sect(birth)
    if s is None:
        return None
    body = body.lower()
    if body == "mercury":
        ms = mercury_sect(birth)
        return None if ms is None else (ms is s)
    if s is Sect.DAY:
        return body in DAY_TEAM
    return body in NIGHT_TEAM


# --- transit ranking guard ------------------------------------------------- #

# Experimental. Must remain False until tests + product approval land.
SECT_TRANSIT_WEIGHTING_ENABLED = False


def transit_sect_weight(body: str, birth: BirthData) -> float:
    """
    Returns a ranking multiplier for a transiting body. Because sect weighting
    for transit ranking is experimental and must not auto-activate, this always
    returns a neutral 1.0 unless the feature flag has been deliberately turned
    on (which requires the accompanying test suite + approval).
    """
    if not SECT_TRANSIT_WEIGHTING_ENABLED:
        return 1.0
    in_sect = body_in_sect(body, birth)
    if in_sect is None:
        return 1.0
    return 1.15 if in_sect else 0.9
