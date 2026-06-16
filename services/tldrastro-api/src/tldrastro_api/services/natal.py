from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

import swisseph as swe

from tldrastro_api.config import get_settings
from tldrastro_api.models import (
    Aspect,
    ChartMetadata,
    ChartSettings,
    ChartSubject,
    HouseSystem,
    NatalChartRequest,
    NatalChartResponse,
    Position,
    Zodiac,
)

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
    ("True Node", "☊", "direction", swe.TRUE_NODE),
    ("Chiron", "⚷", "integration", swe.CHIRON),
    ("Lilith", "⚸", "shadow", swe.MEAN_APOG),
]

HOUSE_SYSTEM_CODES: Dict[HouseSystem, bytes] = {
    HouseSystem.whole_sign: b"W",
    HouseSystem.placidus: b"P",
    HouseSystem.koch: b"K",
    HouseSystem.equal: b"E",
    HouseSystem.porphyry: b"O",
    HouseSystem.regiomontanus: b"R",
}

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


def resolve_datetime(subject: ChartSubject, warnings: List[str]) -> datetime:
    value = subject.datetime
    if value.utc:
        raw = value.utc.replace("Z", "+00:00")
        return datetime.fromisoformat(raw).astimezone(timezone.utc)

    time_value = value.time if value.timeKnown and value.time else "12:00"
    if not value.timeKnown:
        warnings.append("Birth time is unknown; chart calculated at local noon.")

    time_zone_name = value.timeZone or subject.location.timeZone
    if not time_zone_name:
        warnings.append("No timezone supplied; UTC was used.")
        time_zone_name = "UTC"

    try:
        local_zone = ZoneInfo(time_zone_name)
    except Exception:
        warnings.append(f"Timezone '{time_zone_name}' was not recognized; UTC was used.")
        local_zone = timezone.utc

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
    house_system = subject.settings.houseSystem
    code = HOUSE_SYSTEM_CODES[house_system]
    cusps, ascmc = swe.houses_ex(
        julian_day,
        subject.location.latitude,
        subject.location.longitude,
        code,
    )
    return [normalize_degrees(cusp) for cusp in cusps], tuple(ascmc)


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
    delta = shortest_signed_delta(first.longitude - second.longitude, exact_angle)
    relative_speed = first.speed - second.speed
    if relative_speed == 0:
        return None
    next_delta = delta + relative_speed
    return "applying" if abs(next_delta) < abs(delta) else "separating"


def calculate_aspects(positions: List[Position], settings: ChartSettings) -> List[Aspect]:
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
                            }
                        )
                    )
                    break
    return sorted(aspects, key=lambda aspect: aspect.orb)


def calculate_natal_chart(request: NatalChartRequest) -> NatalChartResponse:
    subject = request.subject
    warnings: List[str] = []
    if subject.settings.zodiac == Zodiac.sidereal:
        warnings.append("Sidereal mode is accepted by the contract but not fully configured yet.")

    configure_ephemeris(subject.settings)
    utc_datetime = resolve_datetime(subject, warnings)
    julian_day = julian_day_for(utc_datetime)
    cusps, ascmc = house_cusps(julian_day, subject)
    flags = configured_flags(subject.settings)

    positions: List[Position] = []
    for point, glyph, theme, body_id in BODIES:
        try:
            positions.append(body_position(julian_day, body_id, point, glyph, theme, flags, cusps))
        except Exception as error:
            warnings.append(f"{point} could not be calculated: {error}")

    angles = angle_positions(ascmc, cusps)
    ascendant = angles.get("Ascendant")
    chart_ruler = SIGN_RULERS.get(ascendant.sign) if ascendant else None

    return NatalChartResponse(
        metadata=ChartMetadata(
            houseSystem=subject.settings.houseSystem,
            zodiac=subject.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=warnings,
        ),
        subjectName=subject.name,
        positions=positions,
        angles=angles,
        houseCusps=[round(cusp, 6) for cusp in cusps],
        aspects=calculate_aspects(positions, subject.settings),
        chartRuler=chart_ruler,
        sect=None,
        dignitySummary={},
        contentFacts=[],
    )

