from datetime import datetime, timezone
from typing import Dict, List, Tuple

from tldrastro_api.models import (
    AppResponseContract,
    ChartMetadata,
    CompositeRequest,
    CompositeResponse,
    ContentFactPacket,
    NatalChartRequest,
    Position,
)
from tldrastro_api.services.chart import (
    calculate_aspects,
    house_for_longitude,
    make_position,
    normalize_degrees,
)
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.relationship_facts import composite_aspect_fact

COMPOSITE_POINTS = {
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
    "North Node",
    "Lilith",
}


def midpoint_longitude(first: float, second: float) -> float:
    first = normalize_degrees(first)
    second = normalize_degrees(second)
    difference = normalize_degrees(second - first)
    if difference > 180:
        difference -= 360
    return normalize_degrees(first + difference / 2)


def _positions_by_point(positions: List[Position]) -> Dict[str, Position]:
    return {position.point: position for position in positions}


def _composite_position(point: str, first: Position, second: Position, house_cusps: List[float]) -> Position:
    longitude = midpoint_longitude(first.longitude, second.longitude)
    glyph = first.glyph
    speed = None
    if first.speed is not None and second.speed is not None:
        speed = (first.speed + second.speed) / 2
    declination = None
    if first.declination is not None and second.declination is not None:
        declination = (first.declination + second.declination) / 2
    return make_position(
        point=point,
        glyph=glyph,
        theme=first.theme,
        longitude=longitude,
        house=house_for_longitude(longitude, house_cusps),
        speed=speed,
        declination=declination,
    )


def _midpoint_cusps(first_cusps: List[float], second_cusps: List[float]) -> List[float]:
    return [
        round(midpoint_longitude(first, second), 6)
        for first, second in zip(first_cusps, second_cusps)
    ]


def _midpoint_angles(person_a, person_b, house_cusps: List[float]) -> Dict[str, Position]:
    angles: Dict[str, Position] = {}
    for point in ["Ascendant", "Midheaven"]:
        first = person_a.angles.get(point)
        second = person_b.angles.get(point)
        if not first or not second:
            continue
        longitude = midpoint_longitude(first.longitude, second.longitude)
        angles[point] = make_position(
            point=point,
            glyph=first.glyph,
            theme="angle",
            longitude=longitude,
            house=house_for_longitude(longitude, house_cusps),
        )
    return angles


def _composite_positions(person_a, person_b, house_cusps: List[float]) -> List[Position]:
    a_positions = _positions_by_point(person_a.positions)
    b_positions = _positions_by_point(person_b.positions)
    positions: List[Position] = []
    for point in [position.point for position in person_a.positions if position.point in COMPOSITE_POINTS]:
        first = a_positions.get(point)
        second = b_positions.get(point)
        if first and second:
            positions.append(_composite_position(point, first, second, house_cusps))
    return positions


def _natal_pair(request: CompositeRequest) -> Tuple[object, object]:
    person_a = calculate_natal_chart(
        NatalChartRequest(subject=request.personA, includeContentFacts=request.includeContentFacts)
    )
    person_b = calculate_natal_chart(
        NatalChartRequest(subject=request.personB, includeContentFacts=request.includeContentFacts)
    )
    return person_a, person_b


def calculate_composite(request: CompositeRequest) -> CompositeResponse:
    person_a, person_b = _natal_pair(request)
    house_cusps = _midpoint_cusps(person_a.houseCusps, person_b.houseCusps)
    positions = _composite_positions(person_a, person_b, house_cusps)
    aspects = calculate_aspects(positions, request.settings)
    content_facts = (
        [composite_aspect_fact(aspect, request.settings) for aspect in aspects[:4]]
        if request.includeContentFacts
        else []
    )
    warnings = [
        *person_a.metadata.inputWarnings,
        *person_b.metadata.inputWarnings,
    ]
    return CompositeResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(dict.fromkeys(warnings)),
        ),
        app=_app_contract(aspects, content_facts),
        personA=person_a,
        personB=person_b,
        positions=positions,
        aspects=aspects,
        houseCusps=house_cusps,
        angles=_midpoint_angles(person_a, person_b, house_cusps),
        contentFacts=content_facts,
    )


def _fact_id(fact: ContentFactPacket) -> str:
    if fact.knowledgeIds:
        return fact.knowledgeIds[0]
    return f"{fact.surface}:{fact.eventType}:{fact.headline}".lower().replace(" ", "-")


def _app_contract(aspects, facts: List[ContentFactPacket]) -> AppResponseContract:
    top_aspect = aspects[0] if aspects else None
    headline = (
        f"Composite {top_aspect.from_} {top_aspect.type} {top_aspect.to}"
        if top_aspect
        else "Composite relationship chart"
    )
    summary = (
        f"The composite chart is led by {top_aspect.from_} {top_aspect.type} "
        f"{top_aspect.to}, with {len(aspects)} scored composite aspects."
        if top_aspect
        else "The composite chart is ready for midpoint-based relationship interpretation."
    )
    key_factors = [
        f"Composite {aspect.from_} {aspect.type} {aspect.to}"
        for aspect in aspects[:4]
    ]
    relationship_tags = ["composite", "relationship-chart"]
    if top_aspect:
        relationship_tags.extend(
            [
                top_aspect.from_.lower().replace(" ", "-"),
                top_aspect.to.lower().replace(" ", "-"),
                top_aspect.type,
            ]
        )
    confidence = min(95, 70 + min(20, len(aspects)) + len(facts))
    return AppResponseContract(
        headline=headline,
        summary=summary,
        keyFactors=key_factors,
        timingTags=[],
        relationshipTags=list(dict.fromkeys(relationship_tags)),
        confidence=confidence,
        contentFactIds=[_fact_id(fact) for fact in facts],
    )
