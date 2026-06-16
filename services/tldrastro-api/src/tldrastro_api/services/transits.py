from datetime import datetime, timezone
from typing import List, Optional

from tldrastro_api.models import (
    ChartMetadata,
    ChartSubject,
    NatalChartRequest,
    Position,
    SkyCurrentRequest,
    TransitChartRequest,
    TransitChartResponse,
    TransitHit,
)
from tldrastro_api.services.chart import (
    ASPECT_DEFINITIONS,
    angular_separation,
    aspect_orbs,
    normalize_degrees,
)
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.sky import calculate_current_sky

TRANSIT_PLANET_WEIGHTS = {
    "Sun": 8,
    "Moon": 4,
    "Mercury": 5,
    "Venus": 6,
    "Mars": 7,
    "Jupiter": 14,
    "Saturn": 17,
    "Uranus": 19,
    "Neptune": 18,
    "Pluto": 20,
    "True Node": 12,
    "Chiron": 10,
    "Lilith": 5,
}

NATAL_TARGET_WEIGHTS = {
    "Sun": 14,
    "Moon": 14,
    "Ascendant": 16,
    "Midheaven": 15,
    "Venus": 10,
    "Mars": 10,
    "Mercury": 8,
    "Jupiter": 8,
    "Saturn": 8,
}

ASPECT_WEIGHTS = {
    "conjunction": 10,
    "opposition": 9,
    "square": 8,
    "trine": 5,
    "sextile": 4,
}


def _slug(value: str) -> str:
    return value.lower().replace(" ", "-")


def _target_positions(natal_positions: List[Position], natal_angles: dict) -> List[Position]:
    targets = list(natal_positions)
    for angle_name in ["Ascendant", "Midheaven"]:
        angle = natal_angles.get(angle_name)
        if angle:
            targets.append(angle)
    return targets


def _phase_for_transit(
    transit_position: Position,
    natal_position: Position,
    exact_angle: float,
) -> Optional[str]:
    if transit_position.speed is None:
        return None

    current = abs(angular_separation(transit_position.longitude, natal_position.longitude) - exact_angle)
    next_longitude = normalize_degrees(transit_position.longitude + transit_position.speed)
    next_distance = abs(angular_separation(next_longitude, natal_position.longitude) - exact_angle)
    if next_distance == current:
        return None
    return "applying" if next_distance < current else "separating"


def _score_hit(
    transit_position: Position,
    natal_position: Position,
    aspect_type: str,
    orb: float,
    max_orb: float,
    phase: Optional[str],
) -> int:
    strength = max(0, min(100, round(100 * (1 - orb / max_orb))))
    score = strength
    score += TRANSIT_PLANET_WEIGHTS.get(transit_position.point, 5)
    score += NATAL_TARGET_WEIGHTS.get(natal_position.point, 5)
    score += ASPECT_WEIGHTS.get(aspect_type, 0)
    if phase == "applying":
        score += 6
    return max(0, round(score))


def _transit_hit(
    transit_position: Position,
    natal_position: Position,
    aspect_type: str,
    orb: float,
    max_orb: float,
    exact_angle: float,
) -> TransitHit:
    phase = _phase_for_transit(transit_position, natal_position, exact_angle)
    strength = max(0, min(100, round(100 * (1 - orb / max_orb))))
    transit_slug = _slug(transit_position.point)
    natal_slug = _slug(natal_position.point)
    aspect_slug = _slug(aspect_type)
    return TransitHit(
        id=f"{transit_slug}-{aspect_slug}-{natal_slug}",
        transitPlanet=transit_position.point,
        transitSign=transit_position.sign,
        transitHouse=transit_position.house,
        natalPoint=natal_position.point,
        natalSign=natal_position.sign,
        natalHouse=natal_position.house,
        aspect=aspect_type,
        orb=round(orb, 4),
        applying=phase == "applying" if phase else None,
        phase=phase,
        strength=strength,
        score=_score_hit(transit_position, natal_position, aspect_type, orb, max_orb, phase),
        exactAt=None,
        knowledgeIds=[
            f"transit-natal-{transit_slug}-{aspect_slug}-{natal_slug}",
            f"{transit_slug}-{aspect_slug}-{natal_slug}",
        ],
    )


def _calculate_hits(
    transit_positions: List[Position],
    natal_targets: List[Position],
    request: TransitChartRequest,
) -> List[TransitHit]:
    orbs = aspect_orbs(request.settings)
    hits: List[TransitHit] = []

    for transit_position in transit_positions:
        for natal_position in natal_targets:
            for aspect_type, exact in ASPECT_DEFINITIONS:
                orb = abs(angular_separation(transit_position.longitude, natal_position.longitude) - exact)
                max_orb = orbs[aspect_type]
                if orb <= max_orb:
                    hits.append(
                        _transit_hit(
                            transit_position,
                            natal_position,
                            aspect_type,
                            orb,
                            max_orb,
                            exact,
                        )
                    )
                    break

    return sorted(hits, key=lambda hit: (-hit.score, hit.orb, hit.transitPlanet, hit.natalPoint))


def calculate_transits(request: TransitChartRequest) -> TransitChartResponse:
    natal_chart = calculate_natal_chart(
        NatalChartRequest(
            subject=request.natalSubject,
            includeContentFacts=request.includeContentFacts,
        )
    )

    transit_subject = ChartSubject(
        name="Transit Chart",
        datetime=request.transitDatetime,
        location=request.transitLocation,
        settings=request.settings,
    )
    transit_chart = calculate_current_sky(
        SkyCurrentRequest(
            datetime=transit_subject.datetime,
            location=transit_subject.location,
            settings=transit_subject.settings,
            includeContentFacts=request.includeContentFacts,
        )
    )

    hits = _calculate_hits(
        transit_chart.positions,
        _target_positions(natal_chart.positions, natal_chart.angles),
        request,
    )

    warnings = [
        *natal_chart.metadata.inputWarnings,
        *transit_chart.metadata.inputWarnings,
    ]

    return TransitChartResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=warnings,
        ),
        natal=natal_chart,
        transitChart=transit_chart,
        hits=hits,
        contentFacts=[],
    )
