from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Sequence, Tuple

import swisseph as swe

from tldrastro_api.models import (
    ChartMetadata,
    NatalChartRequest,
    Position,
    ProfectionsRequest,
    ReportIngress,
    ReportKeyDate,
    ReportLunarEvent,
    ReportNatalContact,
    ReportPeriodSegment,
    ReportStation,
    ReportTransitArc,
    ReportTransitPass,
    ReportWindowRequest,
    ReportWindowResponse,
    SolarReturnRequest,
)
from tldrastro_api.services.chart import (
    ASPECT_DEFINITIONS,
    BODY_IDS,
    _bisect_aspect_exact,
    angular_separation,
    aspect_delta,
    configured_flags,
    julian_day_for,
    make_position,
    normalize_degrees,
    sign_for_longitude,
)
from tldrastro_api.services.ephemeris import tracked_calc_ut
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.profections import calculate_profections
from tldrastro_api.services.solar_return import _jd_to_datetime, calculate_solar_return

SLOW_PLANETS = ("Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron")
FAST_PLANETS = ("Sun", "Mercury", "Venus", "Mars")
NATAL_POINTS = (
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Chiron",
    "North Node",
)
RETURN_ELIGIBLE = {
    "Sun",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Chiron",
    "Uranus",
    "North Node",
}
PERSONAL_CONTACT_ORB = 2.0
STATION_NATAL_ORB = 1.5
PASS_ORB = 1.0


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso(julian_day: float) -> str:
    return _jd_to_datetime(julian_day).isoformat().replace("+00:00", "Z")


def _raw_position(julian_day: float, point: str, settings) -> Tuple[float, float, float]:
    result, _ = tracked_calc_ut(
        swe,
        julian_day,
        BODY_IDS[point],
        configured_flags(settings),
    )
    return normalize_degrees(result[0]), result[1], result[3]


def _moving_position(julian_day: float, point: str, settings) -> Position:
    longitude, _, speed = _raw_position(julian_day, point, settings)
    return make_position(point, point, None, longitude, None, speed=speed)


def _fixed_points(natal) -> List[Position]:
    points = [position for position in natal.positions if position.point in NATAL_POINTS]
    for name in ("Ascendant", "Midheaven"):
        if name in natal.angles:
            points.append(natal.angles[name])
    return points


def _root_for_aspect(
    lower: float,
    upper: float,
    planet: str,
    natal_point: Position,
    angle: float,
    settings,
) -> Optional[float]:
    moving = _moving_position(lower, planet, settings)
    root = _bisect_aspect_exact(
        lower,
        upper,
        moving,
        natal_point,
        angle,
        settings,
        True,
        False,
    )
    if root is None:
        return None
    longitude, _, _ = _raw_position(root, planet, settings)
    if abs(aspect_delta(longitude, natal_point.longitude, angle)) > 0.002:
        return None
    return root


def _aspect_roots(
    planet: str,
    natal_point: Position,
    aspect_name: str,
    angle: float,
    start_jd: float,
    end_jd: float,
    settings,
    step: float,
) -> List[float]:
    roots: List[float] = []
    lower = start_jd
    lower_longitude, _, _ = _raw_position(lower, planet, settings)
    lower_delta = aspect_delta(lower_longitude, natal_point.longitude, angle)
    while lower < end_jd:
        upper = min(lower + step, end_jd)
        upper_longitude, _, _ = _raw_position(upper, planet, settings)
        upper_delta = aspect_delta(upper_longitude, natal_point.longitude, angle)
        if lower_delta * upper_delta <= 0 and abs(lower_delta - upper_delta) < 30:
            root = _root_for_aspect(lower, upper, planet, natal_point, angle, settings)
            if root is not None and not any(abs(root - existing) < 0.05 for existing in roots):
                roots.append(root)
        lower = upper
        lower_delta = upper_delta
    return roots


def _bisect_scalar(lower: float, upper: float, function) -> float:
    lower_value = function(lower)
    for _ in range(64):
        midpoint = (lower + upper) / 2
        midpoint_value = function(midpoint)
        if abs(midpoint_value) <= 0.000001:
            return midpoint
        if lower_value * midpoint_value <= 0:
            upper = midpoint
        else:
            lower = midpoint
            lower_value = midpoint_value
    return (lower + upper) / 2


def _stations_for_planet(
    planet: str,
    start_jd: float,
    end_jd: float,
    settings,
    natal_points: Sequence[Position],
) -> List[ReportStation]:
    stations: List[ReportStation] = []
    lower = start_jd
    _, _, lower_speed = _raw_position(lower, planet, settings)
    while lower < end_jd:
        upper = min(lower + 0.5, end_jd)
        _, _, upper_speed = _raw_position(upper, planet, settings)
        if lower_speed * upper_speed <= 0 and abs(lower_speed - upper_speed) < 5:
            root = _bisect_scalar(lower, upper, lambda jd: _raw_position(jd, planet, settings)[2])
            longitude, _, _ = _raw_position(root, planet, settings)
            contacts = _natal_contacts(longitude, natal_points, STATION_NATAL_ORB)
            if contacts:
                motion_after = (
                    "retrograde" if _raw_position(root + 0.1, planet, settings)[2] < 0 else "direct"
                )
                stations.append(
                    ReportStation(
                        planet=planet,
                        occursAt=_iso(root),
                        longitude=round(longitude, 6),
                        motionAfter=motion_after,
                        natalContacts=contacts,
                    )
                )
        lower = upper
        lower_speed = upper_speed
    return stations


def _all_stations(
    start_jd: float,
    end_jd: float,
    settings,
    natal_points: Sequence[Position],
) -> List[ReportStation]:
    stations: List[ReportStation] = []
    for planet in (*SLOW_PLANETS, "Mercury", "Venus", "Mars"):
        try:
            stations.extend(_stations_for_planet(planet, start_jd, end_jd, settings, natal_points))
        except swe.Error:
            continue
    return sorted(stations, key=lambda station: station.occursAt)


def _closest_station(
    planet: str,
    transit_longitude: float,
    stations: Sequence[ReportStation],
) -> Tuple[Optional[float], Optional[str]]:
    candidates = [
        (angular_separation(transit_longitude, station.longitude), station)
        for station in stations
        if station.planet == planet
    ]
    if not candidates:
        return None, None
    distance, station = min(candidates, key=lambda item: item[0])
    if distance > STATION_NATAL_ORB:
        return None, None
    return round(distance, 4), station.occursAt


def _orb_window(
    root: float,
    planet: str,
    natal_point: Position,
    angle: float,
    settings,
) -> Tuple[Optional[str], Optional[str]]:
    def orb(jd: float) -> float:
        longitude, _, _ = _raw_position(jd, planet, settings)
        return abs(aspect_delta(longitude, natal_point.longitude, angle)) - PASS_ORB

    boundaries: List[float] = []
    for direction in (-1.0, 1.0):
        previous = root
        previous_value = orb(previous)
        for index in range(1, 181):
            current = root + direction * index * 0.25
            current_value = orb(current)
            if previous_value * current_value <= 0:
                boundaries.append(
                    _bisect_scalar(min(previous, current), max(previous, current), orb)
                )
                break
            previous = current
            previous_value = current_value
    boundaries.sort()
    return (
        _iso(boundaries[0]) if boundaries else None,
        _iso(boundaries[-1]) if len(boundaries) > 1 else None,
    )


def _category_for_house(house: Optional[int]) -> str:
    if house in {2, 6, 10}:
        return "WORK"
    if house in {5, 7, 8}:
        return "SEX & LOVE"
    if house in {3, 4, 11, 12}:
        return "FRIENDS & FAMILY"
    return "SELF"


def _is_return(planet: str, natal_point: str, aspect: str) -> bool:
    return planet == natal_point and aspect == "conjunction" and planet in RETURN_ELIGIBLE


def _slow_transit_arcs(
    natal,
    start_jd: float,
    end_jd: float,
    settings,
    stations: Sequence[ReportStation],
) -> List[ReportTransitArc]:
    arcs: List[ReportTransitArc] = []
    for planet in SLOW_PLANETS:
        try:
            _raw_position(start_jd, planet, settings)
        except swe.Error:
            continue
        for natal_point in _fixed_points(natal):
            for aspect_name, angle in ASPECT_DEFINITIONS:
                roots = _aspect_roots(
                    planet,
                    natal_point,
                    aspect_name,
                    angle,
                    start_jd,
                    end_jd,
                    settings,
                    1.0,
                )
                if not roots:
                    continue
                passes: List[ReportTransitPass] = []
                for root in roots:
                    longitude, _, speed = _raw_position(root, planet, settings)
                    station_distance, station_at = _closest_station(planet, longitude, stations)
                    orb_start, orb_end = _orb_window(root, planet, natal_point, angle, settings)
                    passes.append(
                        ReportTransitPass(
                            exactAt=_iso(root),
                            motion="retrograde" if speed < 0 else "direct",
                            transitLongitude=round(longitude, 6),
                            orbWindowStart=orb_start,
                            orbWindowEnd=orb_end,
                            stationProximityDegrees=station_distance,
                            stationAt=station_at,
                        )
                    )
                return_flag = _is_return(planet, natal_point.point, aspect_name)
                base_score = 80 + (
                    10 if natal_point.point in {"Sun", "Moon", "Ascendant", "Midheaven"} else 0
                )
                if return_flag:
                    base_score += 10
                arc_id = (
                    f"{planet.lower()}-{aspect_name}-{natal_point.point.lower().replace(' ', '-')}"
                )
                arcs.append(
                    ReportTransitArc(
                        id=arc_id,
                        transitPlanet=planet,
                        natalPoint=natal_point.point,
                        natalSign=natal_point.sign,
                        natalHouse=natal_point.house,
                        aspect=aspect_name,
                        category=_category_for_house(natal_point.house),
                        score=base_score,
                        passCount=len(passes),
                        passes=passes,
                        isReturn=return_flag,
                        knowledgeIds=(
                            [f"authored/transit-return/{planet.lower().replace(' ', '-')}"]
                            if return_flag
                            else []
                        ),
                    )
                )
    return sorted(arcs, key=lambda arc: (-arc.score, arc.passes[0].exactAt, arc.id))


def _fast_key_dates(
    natal, profections, start_jd: float, end_jd: float, settings
) -> List[ReportKeyDate]:
    dates: List[ReportKeyDate] = []
    lord = profections.annual.ruler
    activated = set(profections.activatedNatalPlanets)
    for planet in FAST_PLANETS:
        for natal_point in _fixed_points(natal):
            for aspect_name, angle in ASPECT_DEFINITIONS:
                roots = _aspect_roots(
                    planet,
                    natal_point,
                    aspect_name,
                    angle,
                    start_jd,
                    end_jd,
                    settings,
                    0.25,
                )
                for root in roots:
                    score = 45
                    if planet == lord:
                        score += 25
                    if natal_point.point in activated:
                        score += 15
                    if natal_point.point in {"Sun", "Moon", "Ascendant", "Midheaven"}:
                        score += 15
                    if score < 70:
                        continue
                    event_id = f"{planet.lower()}-{aspect_name}-{natal_point.point.lower().replace(' ', '-')}-{_iso(root)[:10]}"
                    dates.append(
                        ReportKeyDate(
                            id=event_id,
                            occursAt=_iso(root),
                            eventType="fast_transit",
                            transitPlanet=planet,
                            natalPoint=natal_point.point,
                            aspect=aspect_name,
                            category=_category_for_house(natal_point.house),
                            score=score,
                            exactAt=_iso(root),
                        )
                    )
    return sorted(dates, key=lambda item: item.occursAt)


def _natal_contacts(
    longitude: float,
    natal_points: Sequence[Position],
    orb_limit: float = PERSONAL_CONTACT_ORB,
) -> List[ReportNatalContact]:
    contacts: List[ReportNatalContact] = []
    for natal_point in natal_points:
        separation = angular_separation(longitude, natal_point.longitude)
        for aspect_name, angle in ASPECT_DEFINITIONS:
            orb = abs(separation - angle)
            if orb <= orb_limit:
                contacts.append(
                    ReportNatalContact(
                        natalPoint=natal_point.point,
                        aspect=aspect_name,
                        orb=round(orb, 4),
                    )
                )
                break
    return contacts


def _lunation_roots(start_jd: float, end_jd: float, angle: float, settings) -> List[float]:
    def phase(jd: float) -> float:
        moon, _, _ = _raw_position(jd, "Moon", settings)
        sun, _, _ = _raw_position(jd, "Sun", settings)
        return aspect_delta(moon, sun, angle)

    roots: List[float] = []
    lower = start_jd
    lower_delta = phase(lower)
    while lower < end_jd:
        upper = min(lower + 0.25, end_jd)
        upper_delta = phase(upper)
        if lower_delta * upper_delta <= 0 and abs(lower_delta - upper_delta) < 30:
            root = _bisect_scalar(lower, upper, phase)
            if not any(abs(root - existing) < 1 for existing in roots):
                roots.append(root)
        lower = upper
        lower_delta = upper_delta
    return roots


def _lunar_events(natal, start_jd: float, end_jd: float, settings) -> List[ReportLunarEvent]:
    events: List[ReportLunarEvent] = []
    natal_points = _fixed_points(natal)
    for base_kind, angle in (("new_moon", 0.0), ("full_moon", 180.0)):
        for root in _lunation_roots(start_jd, end_jd, angle, settings):
            moon_longitude, moon_latitude, _ = _raw_position(root, "Moon", settings)
            eclipse = abs(moon_latitude) <= 1.0
            kind = (
                "solar_eclipse"
                if eclipse and base_kind == "new_moon"
                else "lunar_eclipse"
                if eclipse
                else base_kind
            )
            _, sign, _, _, _, _ = sign_for_longitude(moon_longitude)
            events.append(
                ReportLunarEvent(
                    id=f"{kind}-{_iso(root)[:10]}",
                    kind=kind,
                    occursAt=_iso(root),
                    longitude=round(moon_longitude, 6),
                    sign=sign,
                    natalContacts=_natal_contacts(
                        moon_longitude,
                        natal_points,
                        3.5 if eclipse else PERSONAL_CONTACT_ORB,
                    ),
                )
            )
    return sorted(events, key=lambda event: event.occursAt)


def _ingresses(
    start_jd: float,
    end_jd: float,
    settings,
    profections,
    natal,
) -> List[ReportIngress]:
    ingresses: List[ReportIngress] = []
    relevant_signs = {profections.annual.sign, *(position.sign for position in natal.positions)}
    for planet in SLOW_PLANETS:
        try:
            _raw_position(start_jd, planet, settings)
        except swe.Error:
            continue
        lower = start_jd
        lower_longitude, _, _ = _raw_position(lower, planet, settings)
        lower_sign = int(lower_longitude // 30)
        while lower < end_jd:
            upper = min(lower + 0.5, end_jd)
            upper_longitude, _, _ = _raw_position(upper, planet, settings)
            upper_sign = int(upper_longitude // 30)
            if (
                upper_sign != lower_sign
                and angular_separation(lower_longitude, upper_longitude) < 5
            ):
                boundary = normalize_degrees(upper_sign * 30.0)
                root = _bisect_scalar(
                    lower,
                    upper,
                    lambda jd, moving_planet=planet, sign_boundary=boundary: (
                        (
                            (_raw_position(jd, moving_planet, settings)[0] - sign_boundary + 180)
                            % 360
                        )
                        - 180
                    ),
                )
                longitude, _, _ = _raw_position(root + 0.001, planet, settings)
                _, sign, _, _, _, _ = sign_for_longitude(longitude)
                if sign in relevant_signs:
                    relevance = []
                    if sign == profections.annual.sign:
                        relevance.append("profected_sign")
                    relevance.extend(
                        f"natal_{position.point.lower().replace(' ', '_')}"
                        for position in natal.positions
                        if position.sign == sign
                    )
                    ingresses.append(
                        ReportIngress(
                            planet=planet,
                            occursAt=_iso(root),
                            sign=sign,
                            longitude=round(boundary, 6),
                            relevance=relevance,
                        )
                    )
            lower = upper
            lower_longitude = upper_longitude
            lower_sign = upper_sign
    return sorted(ingresses, key=lambda ingress: ingress.occursAt)


def _solar_boundary(
    year: int,
    month: int,
    day: int,
    longitude: float,
    settings,
) -> float:
    center = julian_day_for(datetime(year, month, day, tzinfo=timezone.utc))
    return _bisect_scalar(
        center - 3,
        center + 3,
        lambda jd: ((_raw_position(jd, "Sun", settings)[0] - longitude + 180) % 360) - 180,
    )


def _periods(
    start: datetime, end: datetime, settings
) -> Tuple[List[ReportPeriodSegment], List[str]]:
    boundaries: List[Tuple[float, str]] = []
    for year in range(start.year - 1, end.year + 2):
        for month, day, longitude, label in (
            (3, 20, 0.0, "March equinox"),
            (6, 21, 90.0, "June solstice"),
            (9, 22, 180.0, "September equinox"),
            (12, 21, 270.0, "December solstice"),
        ):
            root = _solar_boundary(year, month, day, longitude, settings)
            if julian_day_for(start) <= root <= julian_day_for(end):
                boundaries.append((root, label))
    boundaries.sort()
    points = [
        (julian_day_for(start), "window_start"),
        *boundaries,
        (julian_day_for(end), "window_end"),
    ]
    periods = [
        ReportPeriodSegment(
            id=f"period-{index + 1}",
            startsAt=_iso(current[0]),
            endsAt=_iso(following[0]),
            label=(following[1] if following[1] != "window_end" else "Window close"),
            calendarYear=_jd_to_datetime(current[0]).year,
        )
        for index, (current, following) in enumerate(zip(points, points[1:]))
    ]
    calendar_boundaries = [
        datetime(year, 1, 1, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        for year in range(start.year + 1, end.year + 1)
        if start < datetime(year, 1, 1, tzinfo=timezone.utc) < end
    ]
    return periods, calendar_boundaries


def _solar_return_target(natal_subject, start: datetime, end: datetime) -> Optional[str]:
    birth = date.fromisoformat(natal_subject.datetime.date)
    for year in range(start.year - 1, end.year + 2):
        candidate = date(year, birth.month, min(birth.day, 28 if birth.month == 2 else birth.day))
        if start.date() - timedelta(days=8) <= candidate <= end.date() + timedelta(days=8):
            return candidate.isoformat()
    return None


def calculate_report_window(request: ReportWindowRequest) -> ReportWindowResponse:
    start = _parse_datetime(request.start)
    end = _parse_datetime(request.end)
    if end <= start:
        raise ValueError("Report window end must be after start.")
    natal = calculate_natal_chart(
        NatalChartRequest(subject=request.natalSubject, includeContentFacts=False)
    )
    profections = calculate_profections(
        ProfectionsRequest(
            natalSubject=request.natalSubject,
            targetDate=start.date().isoformat(),
            includeContentFacts=False,
        )
    )
    start_jd = julian_day_for(start)
    end_jd = julian_day_for(end)
    fixed_points = _fixed_points(natal)
    station_scan_start = start_jd - 180
    station_scan_end = end_jd + 180
    all_stations = _all_stations(
        station_scan_start,
        station_scan_end,
        request.settings,
        fixed_points,
    )
    visible_stations = [
        station for station in all_stations if start <= _parse_datetime(station.occursAt) <= end
    ]
    solar_return = None
    if request.includeSolarReturn and request.reportHorizon == "12_months":
        target = _solar_return_target(request.natalSubject, start, end)
        if target:
            solar_return = calculate_solar_return(
                SolarReturnRequest(
                    natalSubject=request.natalSubject,
                    targetDate=target,
                    returnLocation=request.location,
                    settings=request.settings,
                    includeContentFacts=False,
                )
            )
    periods, calendar_boundaries = _periods(start, end, request.settings)
    return ReportWindowResponse(
        metadata=ChartMetadata(
            houseSystem=natal.metadata.houseSystem,
            zodiac=natal.metadata.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(natal.metadata.inputWarnings),
            ephemeris=natal.metadata.ephemeris,
        ),
        reportHorizon=request.reportHorizon,
        startsAt=start.isoformat().replace("+00:00", "Z"),
        endsAt=end.isoformat().replace("+00:00", "Z"),
        natal=natal,
        profections=profections,
        solarReturn=solar_return,
        slowTransitArcs=_slow_transit_arcs(
            natal,
            start_jd,
            end_jd,
            request.settings,
            all_stations,
        ),
        fastTransitKeyDates=_fast_key_dates(
            natal,
            profections,
            start_jd,
            end_jd,
            request.settings,
        ),
        lunarEvents=_lunar_events(natal, start_jd, end_jd, request.settings),
        stations=visible_stations,
        ingresses=_ingresses(start_jd, end_jd, request.settings, profections, natal),
        periods=periods,
        calendarYearBoundaries=calendar_boundaries,
        contentFacts=[],
    )
