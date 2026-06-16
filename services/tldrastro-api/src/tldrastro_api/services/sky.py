import math
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import swisseph as swe

from tldrastro_api.models import (
    ChartMetadata,
    ChartSubject,
    MoonEvent,
    MoonStatus,
    SkyCurrentRequest,
    SkyCurrentResponse,
    Zodiac,
)
from tldrastro_api.services.chart import (
    angle_positions,
    calculate_aspects,
    calculate_positions,
    configure_ephemeris,
    house_cusps,
    julian_day_for,
    normalize_degrees,
    resolve_datetime,
    sign_for_longitude,
)

MAJOR_PLANETS = [
    swe.SUN,
    swe.MERCURY,
    swe.VENUS,
    swe.MARS,
    swe.JUPITER,
    swe.SATURN,
    swe.URANUS,
    swe.NEPTUNE,
    swe.PLUTO,
]

MOON_ASPECT_TARGETS = [0.0, 60.0, 90.0, 120.0, 180.0, 240.0, 270.0, 300.0]


def _sky_subject(request: SkyCurrentRequest) -> ChartSubject:
    return ChartSubject(
        name="Current Sky",
        datetime=request.datetime,
        location=request.location,
        settings=request.settings,
    )


def _exact_longitude(julian_day: float, body_id: int) -> float:
    result, _ = swe.calc_ut(julian_day, body_id, swe.FLG_SWIEPH | swe.FLG_SPEED)
    return normalize_degrees(result[0])


def _moon_sun_phase_angle(julian_day: float) -> float:
    return normalize_degrees(_exact_longitude(julian_day, swe.MOON) - _exact_longitude(julian_day, swe.SUN))


def _moon_phase_name(phase: float) -> str:
    if phase < 8:
        return "New Moon"
    if phase < 67.5:
        return "Waxing Crescent"
    if phase < 112.5:
        return "First Quarter"
    if phase < 157.5:
        return "Waxing Gibbous"
    if phase < 202.5:
        return "Full Moon"
    if phase < 247.5:
        return "Waning Gibbous"
    if phase < 292.5:
        return "Last Quarter"
    return "Waning Crescent"


def _moon_sign(julian_day: float) -> str:
    return sign_for_longitude(_exact_longitude(julian_day, swe.MOON))[1]


def _jd_days_after(julian_day: float, days: float) -> float:
    return julian_day + days


def _datetime_from_julian(julian_day: float) -> datetime:
    year, month, day, hour = swe.revjul(julian_day)
    whole_hour = int(hour)
    minute_float = (hour - whole_hour) * 60
    minute = int(minute_float)
    second = int(round((minute_float - minute) * 60))
    if second == 60:
        minute += 1
        second = 0
    return datetime(year, month, day, whole_hour, minute, second, tzinfo=timezone.utc)


def _moon_ingress_after(julian_day: float) -> Optional[Tuple[str, str, float]]:
    from_sign = _moon_sign(julian_day)
    upper = _jd_days_after(julian_day, 1 / 24)
    max_upper = _jd_days_after(julian_day, 3)

    while upper < max_upper and _moon_sign(upper) == from_sign:
        upper = _jd_days_after(upper, 1 / 24)

    to_sign = _moon_sign(upper)
    if to_sign == from_sign:
        return None

    lower = julian_day
    for _ in range(48):
        midpoint = (lower + upper) / 2
        if _moon_sign(midpoint) == from_sign:
            lower = midpoint
        else:
            upper = midpoint

    return from_sign, to_sign, upper


def _shortest_angle_distance(degrees: float) -> float:
    normalized = normalize_degrees(degrees)
    return normalized - 360 if normalized > 180 else normalized


def _moon_aspect_distance(julian_day: float, body_id: int, target_degrees: float) -> float:
    moon_longitude = _exact_longitude(julian_day, swe.MOON)
    planet_longitude = _exact_longitude(julian_day, body_id)
    return _shortest_angle_distance(normalize_degrees(moon_longitude - planet_longitude) - target_degrees)


def _has_moon_aspect_before_ingress(julian_day: float, ingress_jd: float) -> bool:
    step_days = 15 / 1440
    for body_id in MAJOR_PLANETS:
        for target in MOON_ASPECT_TARGETS:
            previous = _moon_aspect_distance(julian_day, body_id, target)
            cursor = min(julian_day + step_days, ingress_jd)
            while cursor <= ingress_jd:
                current = _moon_aspect_distance(cursor, body_id, target)
                if abs(current) < 0.03 or previous == 0 or previous * current < 0:
                    return True
                previous = current
                cursor += step_days
    return False


def _compact_hours_remaining(start_jd: float, end_jd: float) -> str:
    minutes = max(0, round((end_jd - start_jd) * 1440))
    if minutes < 60:
        return f"{max(1, minutes)}min"
    hours = minutes // 60
    remaining_minutes = minutes % 60
    hour_label = f"{hours}hr{'' if hours == 1 else 's'}"
    return f"{hour_label} {remaining_minutes}min" if remaining_minutes else hour_label


def _moon_status(julian_day: float) -> MoonStatus:
    current_sign = _moon_sign(julian_day)
    ingress = _moon_ingress_after(julian_day)
    if not ingress:
        return MoonStatus(kind="sign", label=current_sign, sign=current_sign)

    _, next_sign, ingress_jd = ingress
    ingress_at = _datetime_from_julian(ingress_jd).isoformat()
    has_applying_aspect = _has_moon_aspect_before_ingress(julian_day, ingress_jd)
    if not has_applying_aspect:
        remaining_label = _compact_hours_remaining(julian_day, ingress_jd)
        return MoonStatus(
            kind="void",
            label=f"VoC ({remaining_label})",
            sign=current_sign,
            nextSign=next_sign,
            until=ingress_at,
            remainingLabel=remaining_label,
        )

    return MoonStatus(
        kind="sign",
        label=current_sign,
        sign=current_sign,
        nextSign=next_sign,
        until=ingress_at,
    )


def _next_moon_event(julian_day: float) -> MoonEvent:
    starting_phase = _moon_sun_phase_angle(julian_day)
    target_phase = 180.0 if starting_phase < 180.0 else 360.0
    event_name = "Full Moon" if target_phase == 180.0 else "New Moon"
    synodic_month_days = 29.530588
    estimated_days = max(0.05, ((target_phase - starting_phase) / 360.0) * synodic_month_days)

    def phase_progress(test_jd: float) -> float:
        phase = _moon_sun_phase_angle(test_jd)
        return phase + 360.0 if phase < starting_phase else phase

    lower = julian_day
    upper = julian_day + estimated_days + 2
    while phase_progress(upper) < target_phase:
        upper += 1

    for _ in range(60):
        midpoint = (lower + upper) / 2
        if phase_progress(midpoint) >= target_phase:
            upper = midpoint
        else:
            lower = midpoint

    occurs_jd = (lower + upper) / 2
    moon_longitude = _exact_longitude(occurs_jd, swe.MOON)
    return MoonEvent(
        name=event_name,
        sign=sign_for_longitude(moon_longitude)[1],
        occursAt=_datetime_from_julian(occurs_jd).isoformat(),
        days=round(max(0.0, occurs_jd - julian_day), 4),
    )


def calculate_current_sky(request: SkyCurrentRequest) -> SkyCurrentResponse:
    subject = _sky_subject(request)
    warnings: List[str] = []
    if subject.settings.zodiac == Zodiac.sidereal:
        warnings.append("Sidereal mode is accepted by the contract but not fully configured yet.")

    configure_ephemeris(subject.settings)
    utc_datetime = resolve_datetime(
        subject,
        warnings,
        "Time is unknown; sky calculated at local noon.",
    )
    julian_day = julian_day_for(utc_datetime)
    cusps, ascmc = house_cusps(julian_day, subject)
    positions = calculate_positions(julian_day, subject.settings, cusps, warnings)
    angles = angle_positions(ascmc, cusps)
    ascendant = angles.get("Ascendant")
    midheaven = angles.get("Midheaven")
    phase_angle = _moon_sun_phase_angle(julian_day)
    illumination = (1 - math.cos(math.radians(phase_angle))) / 2

    return SkyCurrentResponse(
        metadata=ChartMetadata(
            houseSystem=subject.settings.houseSystem,
            zodiac=subject.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=warnings,
        ),
        location=subject.location,
        generatedAt=utc_datetime.isoformat(),
        positions=positions,
        aspects=calculate_aspects(positions, subject.settings),
        angles=angles,
        houseCusps=[round(cusp, 6) for cusp in cusps],
        ascendant=ascendant.sign if ascendant else "",
        ascendantLongitude=ascendant.longitude if ascendant else None,
        midheaven=midheaven.sign if midheaven else "",
        midheavenLongitude=midheaven.longitude if midheaven else None,
        moonPhase=_moon_phase_name(phase_angle),
        moonIllumination=round(illumination, 4),
        moonStatus=_moon_status(julian_day),
        moonEvent=_next_moon_event(julian_day),
        contentFacts=[],
    )
