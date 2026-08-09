from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

import swisseph as swe

from tldrastro_api.models import (
    ChartSubject,
    DateTimeInput,
    NatalChartRequest,
    Position,
    ProfectionsRequest,
    SolarReturnAnalysis,
    SolarReturnAngleContact,
    SolarReturnAspect,
    SolarReturnLordCondition,
    SolarReturnOverlay,
    SolarReturnRequest,
    SolarReturnResponse,
)
from tldrastro_api.services.chart import (
    ASPECT_DEFINITIONS,
    BODY_IDS,
    _bisect_aspect_exact,
    angular_separation,
    configured_flags,
    house_for_longitude,
    julian_day_for,
    normalize_degrees,
)
from tldrastro_api.services.ephemeris import tracked_calc_ut
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.profections import calculate_profections

QUADRANT_HOUSE_SYSTEM = b"P"
ASPECT_ORB = 1.0
ANGLE_ORB = 6.0

DOMICILES = {
    "Sun": {"Leo"},
    "Moon": {"Cancer"},
    "Mercury": {"Gemini", "Virgo"},
    "Venus": {"Taurus", "Libra"},
    "Mars": {"Aries", "Scorpio"},
    "Jupiter": {"Sagittarius", "Pisces"},
    "Saturn": {"Capricorn", "Aquarius"},
}
EXALTATIONS = {
    "Sun": "Aries",
    "Moon": "Taurus",
    "Mercury": "Virgo",
    "Venus": "Pisces",
    "Mars": "Capricorn",
    "Jupiter": "Cancer",
    "Saturn": "Libra",
}
DETRIMENTS = {
    "Sun": {"Aquarius"},
    "Moon": {"Capricorn"},
    "Mercury": {"Sagittarius", "Pisces"},
    "Venus": {"Aries", "Scorpio"},
    "Mars": {"Taurus", "Libra"},
    "Jupiter": {"Gemini", "Virgo"},
    "Saturn": {"Cancer", "Leo"},
}
FALLS = {
    "Sun": "Libra",
    "Moon": "Scorpio",
    "Mercury": "Pisces",
    "Venus": "Virgo",
    "Mars": "Cancer",
    "Jupiter": "Capricorn",
    "Saturn": "Aries",
}


def _jd_to_datetime(julian_day: float) -> datetime:
    year, month, day, hour = swe.revjul(julian_day, swe.GREG_CAL)
    hour_value = int(hour)
    minute_value = int((hour - hour_value) * 60)
    second_value = int(round((((hour - hour_value) * 60) - minute_value) * 60))
    if second_value == 60:
        second_value = 0
        minute_value += 1
    base = datetime(year, month, day, tzinfo=timezone.utc)
    return base + timedelta(hours=hour_value, minutes=minute_value, seconds=second_value)


def _position_by_point(positions: List[Position], point: str) -> Position:
    match = next((position for position in positions if position.point == point), None)
    if match is None:
        raise ValueError(f"{point} could not be calculated.")
    return match


def _solar_return_julian_day(
    natal_sun: Position,
    target_date: str,
    settings,
) -> float:
    target = datetime.fromisoformat(target_date).replace(tzinfo=timezone.utc)
    center = julian_day_for(target)
    moving_sun = natal_sun.model_copy(update={"point": "Sun"})
    previous_jd = center - 8.0
    previous_delta = None

    for step in range(1, 129):
        current_jd = center - 8.0 + step * 0.125
        result, _ = tracked_calc_ut(swe, current_jd, BODY_IDS["Sun"], configured_flags(settings))
        delta = ((result[0] - natal_sun.longitude + 180.0) % 360.0) - 180.0
        if (
            previous_delta is not None
            and previous_delta * delta <= 0
            and abs(previous_delta - delta) < 10
        ):
            exact = _bisect_aspect_exact(
                previous_jd,
                current_jd,
                moving_sun,
                natal_sun,
                0.0,
                settings,
                True,
                False,
            )
            if exact is not None:
                return exact
        previous_jd = current_jd
        previous_delta = delta

    raise ValueError(f"No solar return found near {target_date}.")


def _quadrant_houses(
    julian_day: float,
    latitude: float,
    longitude: float,
    positions: List[Position],
    angles: Dict[str, Position],
) -> Tuple[List[float], Dict[str, int]]:
    cusps, _ = swe.houses_ex(julian_day, latitude, longitude, QUADRANT_HOUSE_SYSTEM)
    rounded = [round(normalize_degrees(cusp), 6) for cusp in cusps]
    houses = {
        position.point: house_for_longitude(position.longitude, rounded) or 12
        for position in positions
    }
    houses.update(
        {
            point: house_for_longitude(position.longitude, rounded) or 12
            for point, position in angles.items()
        }
    )
    return rounded, houses


def _overlays(source, target, source_chart: str, target_chart: str) -> List[SolarReturnOverlay]:
    return [
        SolarReturnOverlay(
            point=position.point,
            sourceChart=source_chart,
            targetChart=target_chart,
            house=house_for_longitude(position.longitude, target.houseCusps) or 12,
        )
        for position in source.positions
    ]


def _angle_contacts(solar_return, natal) -> List[SolarReturnAngleContact]:
    contacts: List[SolarReturnAngleContact] = []
    for point in solar_return.positions:
        for chart_name, chart in (("solar_return", solar_return), ("natal", natal)):
            for angle_name in ("Ascendant", "Midheaven"):
                angle = chart.angles.get(angle_name)
                if angle is None:
                    continue
                orb = angular_separation(point.longitude, angle.longitude)
                if orb <= ANGLE_ORB:
                    contacts.append(
                        SolarReturnAngleContact(
                            point=point.point,
                            angle=angle_name,
                            angleChart=chart_name,
                            orb=round(orb, 4),
                        )
                    )
    for point in natal.positions:
        for angle_name in ("Ascendant", "Midheaven"):
            angle = solar_return.angles.get(angle_name)
            if angle is None:
                continue
            orb = angular_separation(point.longitude, angle.longitude)
            if orb <= ANGLE_ORB:
                contacts.append(
                    SolarReturnAngleContact(
                        point=f"Natal {point.point}",
                        angle=angle_name,
                        angleChart="solar_return",
                        orb=round(orb, 4),
                    )
                )
    return contacts


def _cross_aspects(solar_return, natal) -> List[SolarReturnAspect]:
    aspects: List[SolarReturnAspect] = []
    for return_point in solar_return.positions:
        for natal_point in natal.positions:
            separation = angular_separation(return_point.longitude, natal_point.longitude)
            for aspect_name, angle in ASPECT_DEFINITIONS:
                orb = abs(separation - angle)
                if orb <= ASPECT_ORB:
                    aspects.append(
                        SolarReturnAspect(
                            solarReturnPoint=return_point.point,
                            natalPoint=natal_point.point,
                            aspect=aspect_name,
                            orb=round(orb, 4),
                        )
                    )
                    break
    return aspects


def _essential_condition(ruler: str, sign: str) -> str:
    if sign in DOMICILES.get(ruler, set()):
        return "domicile"
    if EXALTATIONS.get(ruler) == sign:
        return "exaltation"
    if sign in DETRIMENTS.get(ruler, set()):
        return "detriment"
    if FALLS.get(ruler) == sign:
        return "fall"
    return "peregrine"


def _analysis(solar_return, natal, profections, quadrant_houses) -> SolarReturnAnalysis:
    lord = _position_by_point(solar_return.positions, profections.annual.ruler)
    lord_house = quadrant_houses.get(lord.point)
    lord_condition = SolarReturnLordCondition(
        ruler=lord.point,
        sign=lord.sign,
        house=lord_house,
        retrograde=lord.retrograde,
        essentialCondition=_essential_condition(lord.point, lord.sign),
        angular=lord_house in {1, 4, 7, 10},
    )
    return_overlays = _overlays(solar_return, natal, "solar_return", "natal")
    natal_overlays = _overlays(natal, solar_return, "natal", "solar_return")
    activated_house = profections.annual.house
    sr_sun_natal_house = next(item.house for item in return_overlays if item.point == "Sun")
    sr_asc_natal_house = house_for_longitude(
        solar_return.angles["Ascendant"].longitude,
        natal.houseCusps,
    )
    lord_on_angle = any(
        contact.point == lord.point and contact.angleChart == "solar_return"
        for contact in _angle_contacts(solar_return, natal)
    )
    coincidences = {
        "solarReturnSunInProfectedHouse": sr_sun_natal_house == activated_house,
        "solarReturnAscendantInProfectedHouse": sr_asc_natal_house == activated_house,
        "lordOfYearAngular": lord_condition.angular,
        "lordOfYearOnSolarReturnAngle": lord_on_angle,
        "lordOfYearRulesSolarReturnAscendant": solar_return.chartRuler == lord.point,
    }
    weights = {
        "solarReturnSunInProfectedHouse": 2,
        "solarReturnAscendantInProfectedHouse": 2,
        "lordOfYearAngular": 2,
        "lordOfYearOnSolarReturnAngle": 2,
        "lordOfYearRulesSolarReturnAscendant": 1,
    }
    drivers = [name for name, present in coincidences.items() if present]
    if lord_condition.essentialCondition in {"domicile", "exaltation"}:
        drivers.append(f"lordOfYear{lord_condition.essentialCondition.title()}")
    score = sum(weights[name] for name, present in coincidences.items() if present)
    if lord_condition.essentialCondition in {"domicile", "exaltation"}:
        score += 1
    return SolarReturnAnalysis(
        solarReturnToNatalOverlays=return_overlays,
        natalToSolarReturnOverlays=natal_overlays,
        angleContacts=_angle_contacts(solar_return, natal),
        aspects=_cross_aspects(solar_return, natal),
        lordOfYear=lord_condition,
        coincidenceChecks=coincidences,
        bigYearScore=score,
        bigYearDrivers=drivers,
    )


def calculate_solar_return(request: SolarReturnRequest) -> SolarReturnResponse:
    natal = calculate_natal_chart(
        NatalChartRequest(subject=request.natalSubject, includeContentFacts=False)
    )
    natal_sun = _position_by_point(natal.positions, "Sun")
    return_jd = _solar_return_julian_day(natal_sun, request.targetDate, request.settings)
    return_moment = _jd_to_datetime(return_jd)
    location = request.natalSubject.location if request.useBirthplace else request.returnLocation
    if location is None:
        location = request.natalSubject.location
    return_subject = ChartSubject(
        name=request.natalSubject.name,
        datetime=DateTimeInput(
            date=return_moment.date().isoformat(),
            time=return_moment.strftime("%H:%M:%S"),
            timeKnown=True,
            utc=return_moment.isoformat().replace("+00:00", "Z"),
        ),
        location=location,
        settings=request.settings,
    )
    chart = calculate_natal_chart(
        NatalChartRequest(subject=return_subject, includeContentFacts=False)
    )
    quadrant_cusps, quadrant_houses = _quadrant_houses(
        return_jd,
        location.latitude,
        location.longitude,
        chart.positions,
        chart.angles,
    )
    profections = calculate_profections(
        ProfectionsRequest(
            natalSubject=request.natalSubject,
            targetDate=return_moment.date().isoformat(),
            includeContentFacts=False,
        )
    )
    return SolarReturnResponse(
        metadata=chart.metadata,
        returnMoment=return_moment.isoformat().replace("+00:00", "Z"),
        location=location,
        natal=natal,
        chart=chart,
        quadrantHouseSystem="placidus",
        quadrantHouseCusps=quadrant_cusps,
        quadrantHouses=quadrant_houses,
        analysis=_analysis(chart, natal, profections, quadrant_houses),
    )
