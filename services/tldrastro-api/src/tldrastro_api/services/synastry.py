from datetime import datetime, timezone
from typing import List, Literal

from tldrastro_api.models import (
    AppResponseContract,
    ChartMetadata,
    ContentFactPacket,
    HouseOverlay,
    NatalChartRequest,
    Position,
    SynastryContact,
    SynastryRequest,
    SynastryResponse,
)
from tldrastro_api.services.chart import ASPECT_DEFINITIONS, angular_separation, aspect_orbs, house_for_longitude
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.relationship_facts import house_overlay_fact, synastry_contact_fact

POINT_WEIGHTS = {
    "Sun": 14,
    "Moon": 14,
    "Ascendant": 16,
    "Midheaven": 14,
    "Venus": 12,
    "Mars": 12,
    "Mercury": 9,
    "Jupiter": 8,
    "Saturn": 9,
    "True Node": 8,
}

ASPECT_WEIGHTS = {
    "conjunction": 10,
    "opposition": 9,
    "square": 8,
    "trine": 6,
    "sextile": 5,
}

OVERLAY_POINTS = {"Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"}


def _slug(value: str) -> str:
    return value.lower().replace(" ", "-")


def _synastry_points(chart) -> List[Position]:
    points = list(chart.positions)
    for angle_name in ["Ascendant", "Midheaven"]:
        angle = chart.angles.get(angle_name)
        if angle:
            points.append(angle)
    return points


def _strength(orb: float, max_orb: float) -> int:
    return max(0, min(100, round(100 * (1 - orb / max_orb))))


def _score(from_point: str, to_point: str, aspect: str, strength: int) -> int:
    return (
        strength
        + POINT_WEIGHTS.get(from_point, 5)
        + POINT_WEIGHTS.get(to_point, 5)
        + ASPECT_WEIGHTS.get(aspect, 0)
    )


def _contact(
    from_person: Literal["A", "B"],
    from_position: Position,
    to_person: Literal["A", "B"],
    to_position: Position,
    aspect_type: str,
    orb: float,
    max_orb: float,
) -> SynastryContact:
    strength = _strength(orb, max_orb)
    from_slug = _slug(from_position.point)
    to_slug = _slug(to_position.point)
    aspect_slug = _slug(aspect_type)
    return SynastryContact(
        id=f"{from_person.lower()}-{from_slug}-{aspect_slug}-{to_person.lower()}-{to_slug}",
        fromPerson=from_person,
        fromPoint=from_position.point,
        fromSign=from_position.sign,
        fromHouse=from_position.house,
        toPerson=to_person,
        toPoint=to_position.point,
        toSign=to_position.sign,
        toHouse=to_position.house,
        aspect=aspect_type,
        orb=round(orb, 4),
        strength=strength,
        score=_score(from_position.point, to_position.point, aspect_type, strength),
        knowledgeIds=[
            f"synastry-{from_slug}-{aspect_slug}-{to_slug}",
            f"relationship-{from_slug}-{aspect_slug}-{to_slug}",
            f"{from_slug}-{aspect_slug}-{to_slug}",
        ],
    )


def _contacts(
    from_person: Literal["A", "B"],
    from_points: List[Position],
    to_person: Literal["A", "B"],
    to_points: List[Position],
    settings,
) -> List[SynastryContact]:
    orbs = aspect_orbs(settings)
    contacts: List[SynastryContact] = []
    for from_position in from_points:
        for to_position in to_points:
            if from_position.point == to_position.point and from_position.point not in {"Ascendant", "Midheaven"}:
                continue
            separation = angular_separation(from_position.longitude, to_position.longitude)
            for aspect_type, exact in ASPECT_DEFINITIONS:
                orb = abs(separation - exact)
                max_orb = orbs[aspect_type]
                if orb <= max_orb:
                    contacts.append(
                        _contact(
                            from_person,
                            from_position,
                            to_person,
                            to_position,
                            aspect_type,
                            orb,
                            max_orb,
                        )
                    )
                    break
    return contacts


def _overlay_id(planet_owner: Literal["A", "B"], house_owner: Literal["A", "B"], point: str, house: int) -> str:
    return f"{planet_owner.lower()}-{_slug(point)}-in-{house_owner.lower()}-house-{house}"


def _overlays(
    planet_owner: Literal["A", "B"],
    planet_chart,
    house_owner: Literal["A", "B"],
    house_chart,
) -> List[HouseOverlay]:
    overlays: List[HouseOverlay] = []
    for position in planet_chart.positions:
        if position.point not in OVERLAY_POINTS:
            continue
        house = house_for_longitude(position.longitude, house_chart.houseCusps)
        if not house:
            continue
        point_slug = _slug(position.point)
        overlays.append(
            HouseOverlay(
                id=_overlay_id(planet_owner, house_owner, position.point, house),
                planetOwner=planet_owner,
                houseOwner=house_owner,
                point=position.point,
                sign=position.sign,
                house=house,
                knowledgeIds=[
                    f"synastry-{point_slug}-in-house-{house}",
                    f"relationship-{point_slug}-in-house-{house}",
                ],
            )
        )
    return overlays


def _fact_id(fact: ContentFactPacket) -> str:
    if fact.knowledgeIds:
        return fact.knowledgeIds[0]
    return f"{fact.surface}:{fact.eventType}:{fact.headline}".lower().replace(" ", "-")


def _content_facts(contacts: List[SynastryContact], overlays: List[HouseOverlay], settings) -> List[ContentFactPacket]:
    facts: List[ContentFactPacket] = []
    facts.extend(synastry_contact_fact(contact, settings) for contact in contacts[:6])
    facts.extend(house_overlay_fact(overlay, settings) for overlay in overlays[:4])
    return facts[:10]


def _app_contract(contacts: List[SynastryContact], overlays: List[HouseOverlay], facts: List[ContentFactPacket]) -> AppResponseContract:
    top_contact = contacts[0] if contacts else None
    headline = (
        f"{top_contact.fromPoint} {top_contact.aspect} {top_contact.toPoint}"
        if top_contact
        else "Synastry contact map"
    )
    summary = (
        f"The strongest contact is {top_contact.fromPoint} {top_contact.aspect} "
        f"{top_contact.toPoint}, with {len(contacts)} scored contacts and "
        f"{len(overlays)} house overlays."
        if top_contact
        else f"This comparison has {len(contacts)} scored contacts and {len(overlays)} house overlays."
    )
    key_factors = [
        f"{contact.fromPoint} {contact.aspect} {contact.toPoint}"
        for contact in contacts[:3]
    ]
    key_factors.extend(
        f"{overlay.point} in {overlay.houseOwner}'s {overlay.house} house"
        for overlay in overlays[:2]
    )
    relationship_tags = ["synastry", "relationship-compare"]
    if top_contact:
        relationship_tags.extend(
            [
                top_contact.fromPoint.lower().replace(" ", "-"),
                top_contact.toPoint.lower().replace(" ", "-"),
                top_contact.aspect,
            ]
        )
    confidence = min(95, 65 + min(20, len(contacts)) + min(10, len(overlays)))
    return AppResponseContract(
        headline=headline,
        summary=summary,
        keyFactors=key_factors,
        timingTags=[],
        relationshipTags=list(dict.fromkeys(relationship_tags)),
        confidence=confidence,
        contentFactIds=[_fact_id(fact) for fact in facts],
    )


def calculate_synastry(request: SynastryRequest) -> SynastryResponse:
    person_a = calculate_natal_chart(
        NatalChartRequest(subject=request.personA, includeContentFacts=request.includeContentFacts)
    )
    person_b = calculate_natal_chart(
        NatalChartRequest(subject=request.personB, includeContentFacts=request.includeContentFacts)
    )
    contacts = [
        *_contacts("A", _synastry_points(person_a), "B", _synastry_points(person_b), request.settings),
        *_contacts("B", _synastry_points(person_b), "A", _synastry_points(person_a), request.settings),
    ]
    contacts = sorted(contacts, key=lambda contact: (-contact.score, contact.orb, contact.id))
    overlays = [
        *_overlays("A", person_a, "B", person_b),
        *_overlays("B", person_b, "A", person_a),
    ]
    warnings = [
        *person_a.metadata.inputWarnings,
        *person_b.metadata.inputWarnings,
    ]
    content_facts = _content_facts(contacts, overlays, request.settings) if request.includeContentFacts else []

    return SynastryResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(dict.fromkeys(warnings)),
        ),
        app=_app_contract(contacts, overlays, content_facts),
        personA=person_a,
        personB=person_b,
        contacts=contacts,
        houseOverlays=overlays,
        contentFacts=content_facts,
    )
