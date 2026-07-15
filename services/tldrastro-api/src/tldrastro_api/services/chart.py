from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import swisseph as swe

from tldrastro_api.config import get_settings
from tldrastro_api.models import (
    Aspect,
    AspectConditions,
    ChartSettings,
    ChartSubject,
    HouseSystem,
    Position,
    Zodiac,
)
from tldrastro_api.services.timezone import resolve_timezone_name

SIGNS: List[Tuple[str, str]] = [
    ("Aries", "♈"),
    ("Taurus", "♉"),
    ("Gemini", "♊"),
    ("Cancer", "♋"),
    ("Leo", "♌"),
    ("Virgo", "♍"),
    ("Libra", "♎"),
    ("Scorpio", "♏"),
    ("Sagittarius", "♐"),
    ("Capricorn", "♑"),
    ("Aquarius", "♒"),
    ("Pisces", "♓"),
]

BODIES: List[Tuple[str, str, str, int]] = [
    ("Sun", "☉", "identity", swe.SUN),
    ("Moon", "☽", "mood", swe.MOON),
    ("Mercury", "☿", "language", swe.MERCURY),
    ("Venus", "♀", "desire", swe.VENUS),
    ("Mars", "♂", "momentum", swe.MARS),
    ("Jupiter", "♃", "growth", swe.JUPITER),
    ("Saturn", "♄", "structure", swe.SATURN),
    ("Uranus", "♅", "change", swe.URANUS),
    ("Neptune", "♆", "imagination", swe.NEPTUNE),
    ("Pluto", "♇", "depth", swe.PLUTO),
    ("North Node", "☊", "direction", swe.MEAN_NODE),
    ("Chiron", "⚷", "integration", swe.CHIRON),
    ("Lilith", "⚸", "shadow", swe.MEAN_APOG),
]

BODY_IDS: Dict[str, int] = {point: body_id for point, _, _, body_id in BODIES}

TRADITIONAL_PLANETS = {"Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"}

COMBUSTION_ORB_DEGREES = 8.0

FAVOR_CASES = {
    ("Mercury", "Pisces", "Venus", "Pisces"),
    ("Venus", "Virgo", "Mercury", "Virgo"),
    ("Saturn", "Aries", "Sun", "Aries"),
}

CANONICAL_HOUSE_SYSTEM = HouseSystem.whole_sign
WHOLE_SIGN_HOUSE_SYSTEM_CODE = b"W"

ASPECT_DEFINITIONS: List[Tuple[str, float]] = [
    ("conjunction", 0.0),
    ("sextile", 60.0),
    ("square", 90.0),
    ("trine", 120.0),
    ("opposition", 180.0),
]

STANDARD_ORBS = {
    "conjunction": 8.0,
    "opposition": 8.0,
    "square": 7.0,
    "trine": 7.0,
    "sextile": 5.0,
}

TIGHT_ORBS = {
    "conjunction": 5.0,
    "opposition": 5.0,
    "square": 4.0,
    "trine": 4.0,
    "sextile": 3.0,
}

SIGN_RULERS = {
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Saturn",
    "Pisces": "Jupiter",
}


def normalize_degrees(value: float) -> float:
    return value % 360.0


def whole_sign_cusps_for_ascendant(ascendant_longitude: float) -> List[float]:
    sign_index, *_ = sign_for_longitude(ascendant_longitude)
    first_house = sign_index * 30.0
    return [normalize_degrees(first_house + index * 30.0) for index in range(12)]


def sign_for_longitude(longitude: float) -> Tuple[int, str, str, float, int, int]:
    normalized = normalize_degrees(longitude)
    sign_index = int(normalized // 30)
    sign, glyph = SIGNS[sign_index]
    degree_decimal = normalized % 30
    degree = int(degree_decimal)
    minute = int(round((degree_decimal - degree) * 60))
    if minute == 60:
        degree += 1
        minute = 0
    return sign_index, sign, glyph, degree_decimal, degree, minute


def angular_separation(first: float, second: float) -> float:
    difference = abs(normalize_degrees(first - second))
    return 360.0 - difference if difference > 180.0 else difference


def shortest_signed_delta(first: float, second: float) -> float:
    delta = normalize_degrees(first - second)
    return delta - 360.0 if delta > 180.0 else delta


def aspect_delta(first: float, second: float, exact_angle: float) -> float:
    difference = normalize_degrees(first - second)
    targets = [exact_angle]
    reverse = normalize_degrees(360.0 - exact_angle)
    if reverse not in targets:
        targets.append(reverse)
    return min(
        (shortest_signed_delta(difference, target) for target in targets),
        key=abs,
    )


def resolve_datetime(subject: ChartSubject, warnings: List[str], unknown_time_message: str) -> datetime:
    value = subject.datetime
    if value.utc:
        raw = value.utc.replace("Z", "+00:00")
        return datetime.fromisoformat(raw).astimezone(timezone.utc)

    time_value = value.time if value.timeKnown and value.time else "12:00"
    if not value.timeKnown:
        warnings.append(unknown_time_message)

    time_zone_name = value.timeZone or subject.location.timeZone
    if not time_zone_name:
        try:
            time_zone_name, timezone_source, lookup_warnings = resolve_timezone_name(
                subject.location.latitude,
                subject.location.longitude,
                value.date,
            )
            warnings.extend(lookup_warnings)
            warnings.append(f"No timezone supplied; resolved {time_zone_name} from {timezone_source}.")
        except Exception as error:
            raise ValueError(f"No timezone supplied and coordinate lookup failed: {error}") from error

    try:
        local_zone = ZoneInfo(time_zone_name)
    except Exception as error:
        raise ValueError(f"Timezone '{time_zone_name}' was not recognized.") from error

    local = datetime.fromisoformat(f"{value.date}T{time_value}:00")
    return local.replace(tzinfo=local_zone).astimezone(timezone.utc)


def julian_day_for(date: datetime) -> float:
    utc = date.astimezone(timezone.utc)
    hour = utc.hour + utc.minute / 60.0 + utc.second / 3600.0 + utc.microsecond / 3_600_000_000.0
    return swe.julday(utc.year, utc.month, utc.day, hour)


def configured_flags(settings: ChartSettings) -> int:
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    if settings.zodiac == Zodiac.sidereal:
        flags |= swe.FLG_SIDEREAL
    return flags


def configure_ephemeris(settings: ChartSettings) -> None:
    service_settings = get_settings()
    if service_settings.ephemeris_path:
        swe.set_ephe_path(service_settings.ephemeris_path)
    if settings.zodiac == Zodiac.sidereal and settings.ayanamsa:
        # Additional named ayanamsa mapping can be added when sidereal support is activated.
        pass


def house_cusps(julian_day: float, subject: ChartSubject) -> Tuple[List[float], Tuple[float, ...]]:
    cusps, ascmc = swe.houses_ex(
        julian_day,
        subject.location.latitude,
        subject.location.longitude,
        WHOLE_SIGN_HOUSE_SYSTEM_CODE,
    )
    return whole_sign_cusps_for_ascendant(ascmc[0]), tuple(ascmc)


def house_for_longitude(longitude: float, cusps: List[float]) -> Optional[int]:
    if len(cusps) != 12:
        return None
    point = normalize_degrees(longitude)
    for index, start in enumerate(cusps):
        end = cusps[(index + 1) % 12]
        if end <= start:
            end += 360.0
        shifted_point = point + 360.0 if point < start else point
        if start <= shifted_point < end:
            return index + 1
    return 12


def make_position(
    point: str,
    glyph: str,
    theme: Optional[str],
    longitude: float,
    house: Optional[int],
    speed: Optional[float] = None,
    declination: Optional[float] = None,
) -> Position:
    _, sign, sign_glyph, degree_decimal, degree, minute = sign_for_longitude(longitude)
    retrograde = bool(speed is not None and speed < 0)
    return Position(
        point=point,
        planet=point,
        glyph=glyph,
        longitude=round(normalize_degrees(longitude), 6),
        sign=sign,
        signGlyph=sign_glyph,
        degree=degree,
        minute=minute,
        degreeDecimal=round(degree_decimal, 6),
        house=house,
        retrograde=retrograde,
        motion="retrograde" if retrograde else "direct",
        speed=round(speed, 8) if speed is not None else None,
        declination=round(declination, 6) if declination is not None else None,
        theme=theme,
    )


def body_position(
    julian_day: float,
    body_id: int,
    point: str,
    glyph: str,
    theme: str,
    flags: int,
    cusps: List[float],
) -> Position:
    result, _ = swe.calc_ut(julian_day, body_id, flags)
    equatorial_result, _ = swe.calc_ut(julian_day, body_id, flags | swe.FLG_EQUATORIAL)
    longitude = normalize_degrees(result[0])
    return make_position(
        point=point,
        glyph=glyph,
        theme=theme,
        longitude=longitude,
        house=house_for_longitude(longitude, cusps),
        speed=result[3],
        declination=equatorial_result[1],
    )


def calculate_positions(
    julian_day: float,
    settings: ChartSettings,
    cusps: List[float],
    warnings: List[str],
) -> List[Position]:
    flags = configured_flags(settings)
    positions: List[Position] = []
    for point, glyph, theme, body_id in BODIES:
        try:
            positions.append(body_position(julian_day, body_id, point, glyph, theme, flags, cusps))
        except Exception as error:
            warnings.append(f"{point} could not be calculated: {error}")
    return positions


def angle_positions(ascmc: Tuple[float, ...], cusps: List[float]) -> Dict[str, Position]:
    angle_specs = [
        ("Ascendant", "ASC", 0, "angle"),
        ("Midheaven", "MC", 1, "angle"),
        ("Vertex", "Vx", 3, "angle"),
        ("Equatorial Ascendant", "Eq", 4, "angle"),
    ]
    angles: Dict[str, Position] = {}
    for point, glyph, index, theme in angle_specs:
        if index < len(ascmc):
            longitude = normalize_degrees(ascmc[index])
            angles[point] = make_position(
                point=point,
                glyph=glyph,
                theme=theme,
                longitude=longitude,
                house=house_for_longitude(longitude, cusps),
            )
    return angles


def aspect_orbs(settings: ChartSettings) -> Dict[str, float]:
    base = TIGHT_ORBS if settings.aspectProfile.value == "tight" else STANDARD_ORBS
    return {**base, **(settings.orbs or {})}


def applying_phase(first: Position, second: Position, exact_angle: float) -> Optional[str]:
    if first.speed is None or second.speed is None:
        return None
    delta = aspect_delta(first.longitude, second.longitude, exact_angle)
    relative_speed = first.speed - second.speed
    if relative_speed == 0:
        return None
    next_delta = aspect_delta(
        normalize_degrees(first.longitude + first.speed),
        normalize_degrees(second.longitude + second.speed),
        exact_angle,
    )
    return "applying" if abs(next_delta) < abs(delta) else "separating"


def _faster_participant(first: Position, second: Position) -> Tuple[Optional[Position], Optional[Position]]:
    if first.speed is None or second.speed is None:
        return None, None
    if abs(first.speed) == abs(second.speed):
        return None, None
    return (first, second) if abs(first.speed) > abs(second.speed) else (second, first)


def _point_position(positions: List[Position], point: str) -> Optional[Position]:
    return next((position for position in positions if position.point == point), None)


def _ephemeris_position(
    julian_day: float,
    point: str,
    fallback: Position,
    settings: ChartSettings,
) -> Position:
    body_id = BODY_IDS.get(point)
    if body_id is None:
        return fallback
    result, _ = swe.calc_ut(julian_day, body_id, configured_flags(settings))
    _, sign, sign_glyph, degree_decimal, degree, minute = sign_for_longitude(result[0])
    return Position(
        point=fallback.point,
        planet=fallback.planet,
        glyph=fallback.glyph,
        longitude=round(normalize_degrees(result[0]), 6),
        sign=sign,
        signGlyph=sign_glyph,
        degree=degree,
        minute=minute,
        degreeDecimal=round(degree_decimal, 6),
        house=fallback.house,
        retrograde=result[3] < 0,
        motion="retrograde" if result[3] < 0 else "direct",
        speed=round(result[3], 8),
        declination=fallback.declination,
        theme=fallback.theme,
    )


def _aspect_orb(first: Position, second: Position, exact_angle: float) -> float:
    return abs(aspect_delta(first.longitude, second.longitude, exact_angle))


def _aspect_delta_for_positions(
    julian_day: float,
    first: Position,
    second: Position,
    exact_angle: float,
    settings: ChartSettings,
    move_first: bool,
    move_second: bool,
) -> float:
    current_first = _ephemeris_position(julian_day, first.point, first, settings) if move_first else first
    current_second = _ephemeris_position(julian_day, second.point, second, settings) if move_second else second
    return aspect_delta(current_first.longitude, current_second.longitude, exact_angle)


def _bisect_aspect_exact(
    lower_julian_day: float,
    upper_julian_day: float,
    first: Position,
    second: Position,
    exact_angle: float,
    settings: ChartSettings,
    move_first: bool,
    move_second: bool,
) -> Optional[float]:
    lower_delta = _aspect_delta_for_positions(
        lower_julian_day,
        first,
        second,
        exact_angle,
        settings,
        move_first,
        move_second,
    )
    upper_delta = _aspect_delta_for_positions(
        upper_julian_day,
        first,
        second,
        exact_angle,
        settings,
        move_first,
        move_second,
    )
    if abs(lower_delta) <= 0.0001:
        return lower_julian_day
    if abs(upper_delta) <= 0.0001:
        return upper_julian_day
    if lower_delta * upper_delta > 0:
        return None

    lower = lower_julian_day
    upper = upper_julian_day
    for _ in range(64):
        midpoint = (lower + upper) / 2
        midpoint_delta = _aspect_delta_for_positions(
            midpoint,
            first,
            second,
            exact_angle,
            settings,
            move_first,
            move_second,
        )
        if abs(midpoint_delta) <= 0.0001:
            return midpoint
        if lower_delta * midpoint_delta <= 0:
            upper = midpoint
            upper_delta = midpoint_delta
        else:
            lower = midpoint
            lower_delta = midpoint_delta

    return (lower + upper) / 2


def _estimated_days_to_exact(
    first: Position,
    second: Position,
    exact_angle: float,
    julian_day: float,
    settings: ChartSettings,
    move_first: bool = True,
    move_second: bool = True,
) -> Optional[float]:
    current_delta = aspect_delta(first.longitude, second.longitude, exact_angle)
    if abs(current_delta) <= 0.02:
        return 0.0

    first_speed = first.speed if move_first and first.speed is not None else 0.0
    second_speed = second.speed if move_second and second.speed is not None else 0.0
    relative_speed = first_speed - second_speed
    if relative_speed == 0:
        return None

    estimated_days = -current_delta / relative_speed
    if estimated_days <= 0:
        estimated_days = abs(current_delta) / abs(relative_speed)
    if estimated_days <= 0 or estimated_days > 4000:
        return None

    lower = julian_day
    upper = julian_day + max(estimated_days * 1.5, 1 / 24)
    max_upper = julian_day + min(max(estimated_days * 8, 1), 4000)
    while upper <= max_upper:
        exact_julian_day = _bisect_aspect_exact(
            lower,
            upper,
            first,
            second,
            exact_angle,
            settings,
            move_first,
            move_second,
        )
        if exact_julian_day is not None:
            return exact_julian_day - julian_day
        upper = julian_day + (upper - julian_day) * 2

    return None


def _receiver_leaves_sign_before(
    receiver: Position,
    julian_day: float,
    exact_julian_day: float,
    settings: ChartSettings,
    receiver_moves: bool = True,
) -> bool:
    if not receiver_moves:
        return False

    body_id = BODY_IDS.get(receiver.point)
    if body_id is None:
        return False

    start_sign = receiver.sign
    lower = julian_day
    duration = exact_julian_day - julian_day
    step_days = max(1 / 1440, min(0.05, duration / 128 if duration > 0 else 1 / 1440))
    upper = min(exact_julian_day, lower + step_days)
    while upper <= exact_julian_day:
        if _ephemeris_position(upper, receiver.point, receiver, settings).sign != start_sign:
            for _ in range(64):
                midpoint = (lower + upper) / 2
                if _ephemeris_position(midpoint, receiver.point, receiver, settings).sign == start_sign:
                    lower = midpoint
                else:
                    upper = midpoint
            return upper < exact_julian_day
        lower = upper
        upper = min(exact_julian_day, upper + step_days)
        if upper == lower:
            break

    return False


def _stations_retrograde_before(
    applying: Position,
    julian_day: float,
    exact_julian_day: float,
    settings: ChartSettings,
) -> bool:
    body_id = BODY_IDS.get(applying.point)
    if body_id is None or applying.speed is None or applying.speed < 0:
        return False

    lower = julian_day
    duration = exact_julian_day - julian_day
    step_days = max(1 / 1440, min(0.25, duration / 128 if duration > 0 else 1 / 1440))
    previous_speed = applying.speed
    upper = min(exact_julian_day, lower + step_days)
    while upper <= exact_julian_day:
        position = _ephemeris_position(upper, applying.point, applying, settings)
        current_speed = position.speed if position.speed is not None else previous_speed
        if previous_speed >= 0 and current_speed < 0:
            for _ in range(64):
                midpoint = (lower + upper) / 2
                midpoint_position = _ephemeris_position(midpoint, applying.point, applying, settings)
                midpoint_speed = midpoint_position.speed if midpoint_position.speed is not None else current_speed
                if midpoint_speed >= 0:
                    lower = midpoint
                else:
                    upper = midpoint
            return upper < exact_julian_day
        previous_speed = current_speed
        lower = upper
        upper = min(exact_julian_day, upper + step_days)
        if upper == lower:
            break

    return False


def _perfects_before_limits(
    first: Position,
    second: Position,
    receiver: Position,
    applying: Position,
    exact_angle: float,
    phase: Optional[str],
    julian_day: Optional[float],
    settings: ChartSettings,
    move_first: bool = True,
    move_second: bool = True,
    receiver_moves: bool = True,
) -> bool:
    if phase != "applying" or julian_day is None:
        return False

    days_to_exact = _estimated_days_to_exact(
        first,
        second,
        exact_angle,
        julian_day,
        settings,
        move_first,
        move_second,
    )
    if days_to_exact is None:
        return False

    exact_julian_day = julian_day + days_to_exact
    exact_first = _ephemeris_position(exact_julian_day, first.point, first, settings) if move_first else first
    exact_second = _ephemeris_position(exact_julian_day, second.point, second, settings) if move_second else second
    if _aspect_orb(exact_first, exact_second, exact_angle) > 0.1:
        return False

    if _receiver_leaves_sign_before(
        receiver,
        julian_day,
        exact_julian_day,
        settings,
        receiver_moves,
    ):
        return False

    return not _stations_retrograde_before(applying, julian_day, exact_julian_day, settings)


def aspect_conditions(
    first: Position,
    second: Position,
    exact_angle: float,
    phase: Optional[str],
    positions: List[Position],
    settings: ChartSettings,
    julian_day: Optional[float] = None,
) -> AspectConditions:
    applying_planet, receiver = _faster_participant(first, second)
    if applying_planet is None or receiver is None:
        return AspectConditions(applying=phase == "applying")

    sun = _point_position(positions, "Sun")
    receiver_is_traditional = receiver.point in TRADITIONAL_PLANETS
    applying_is_traditional = applying_planet.point in TRADITIONAL_PLANETS
    receiver_combust = (
        receiver_is_traditional
        and receiver.point != "Sun"
        and sun is not None
        and angular_separation(receiver.longitude, sun.longitude) <= COMBUSTION_ORB_DEGREES
    )
    reception = (
        phase == "applying"
        and applying_is_traditional
        and receiver_is_traditional
        and SIGN_RULERS.get(applying_planet.sign) == receiver.point
    )
    favor_eligible = (
        receiver_is_traditional
        and applying_is_traditional
        and (
            receiver.point,
            receiver.sign,
            applying_planet.point,
            applying_planet.sign,
        )
        in FAVOR_CASES
    )

    return AspectConditions(
        applying=phase == "applying",
        perfects=_perfects_before_limits(
            first,
            second,
            receiver,
            applying_planet,
            exact_angle,
            phase,
            julian_day,
            settings,
        ),
        receiverRetrograde=receiver.retrograde,
        receiverCombust=receiver_combust,
        reception=reception,
        favorEligible=favor_eligible,
    )


def transit_aspect_conditions(
    transit_position: Position,
    natal_position: Position,
    exact_angle: float,
    phase: Optional[str],
    transit_positions: List[Position],
    natal_positions: List[Position],
    settings: ChartSettings,
    julian_day: Optional[float] = None,
) -> AspectConditions:
    receiver = natal_position
    sun = _point_position(natal_positions, "Sun")
    receiver_is_traditional = receiver.point in TRADITIONAL_PLANETS
    applying_is_traditional = transit_position.point in TRADITIONAL_PLANETS
    receiver_combust = (
        receiver_is_traditional
        and receiver.point != "Sun"
        and sun is not None
        and angular_separation(receiver.longitude, sun.longitude) <= COMBUSTION_ORB_DEGREES
    )
    reception = (
        phase == "applying"
        and applying_is_traditional
        and receiver_is_traditional
        and SIGN_RULERS.get(transit_position.sign) == receiver.point
    )
    favor_eligible = (
        receiver_is_traditional
        and applying_is_traditional
        and (
            receiver.point,
            receiver.sign,
            transit_position.point,
            transit_position.sign,
        )
        in FAVOR_CASES
    )

    return AspectConditions(
        applying=phase == "applying",
        perfects=_perfects_before_limits(
            transit_position,
            natal_position,
            receiver,
            transit_position,
            exact_angle,
            phase,
            julian_day,
            settings,
            move_first=True,
            move_second=False,
            receiver_moves=False,
        ),
        receiverRetrograde=receiver.retrograde,
        receiverCombust=receiver_combust,
        reception=reception,
        favorEligible=favor_eligible,
    )


def calculate_aspects(
    positions: List[Position],
    settings: ChartSettings,
    julian_day: Optional[float] = None,
) -> List[Aspect]:
    orbs = aspect_orbs(settings)
    aspects: List[Aspect] = []
    for first_index, first in enumerate(positions):
        for second in positions[first_index + 1 :]:
            separation = angular_separation(first.longitude, second.longitude)
            for aspect_type, exact in ASPECT_DEFINITIONS:
                orb = abs(separation - exact)
                max_orb = orbs[aspect_type]
                if orb <= max_orb:
                    phase = applying_phase(first, second, exact)
                    conditions = aspect_conditions(
                        first,
                        second,
                        exact,
                        phase,
                        positions,
                        settings,
                        julian_day,
                    )
                    aspects.append(
                        Aspect(
                            **{
                                "from": first.point,
                                "to": second.point,
                                "type": aspect_type,
                                "orb": round(orb, 4),
                                "applying": phase == "applying" if phase else None,
                                "phase": phase,
                                "strength": max(0, min(100, round(100 * (1 - orb / max_orb)))),
                                "fromHouse": first.house,
                                "toHouse": second.house,
                                "knowledgeIds": [
                                    f"{first.point.lower().replace(' ', '-')}-"
                                    f"{aspect_type}-"
                                    f"{second.point.lower().replace(' ', '-')}"
                                ],
                                "conditions": conditions,
                            }
                        )
                    )
                    break
    return sorted(aspects, key=lambda aspect: aspect.orb)
