from typing import List

from tldrastro_api.models import ContentFactPacket, HouseSystem


def synastry_contact_fact(contact, settings) -> ContentFactPacket:
    return ContentFactPacket(
        surface="synastry",
        eventType="synastry-contact",
        headline=f"{contact.fromPoint} {contact.aspect} {contact.toPoint}",
        priority=min(100, contact.score),
        timeSensitivity="timeless",
        houseSystem=HouseSystem.whole_sign,
        zodiac=settings.zodiac,
        facts={
            "type": "synastry_contact",
            "fromPerson": contact.fromPerson,
            "fromPoint": contact.fromPoint,
            "fromSign": contact.fromSign,
            "fromHouse": contact.fromHouse,
            "toPerson": contact.toPerson,
            "toPoint": contact.toPoint,
            "toSign": contact.toSign,
            "toHouse": contact.toHouse,
            "aspect": contact.aspect,
            "orb": contact.orb,
            "score": contact.score,
        },
        knowledgeIds=contact.knowledgeIds,
    )


def house_overlay_fact(overlay, settings) -> ContentFactPacket:
    return ContentFactPacket(
        surface="synastry",
        eventType="house-overlay",
        headline=f"{overlay.point} in the {overlay.house} house",
        priority=70,
        timeSensitivity="timeless",
        houseSystem=HouseSystem.whole_sign,
        zodiac=settings.zodiac,
        facts={
            "type": "house_overlay",
            "planetOwner": overlay.planetOwner,
            "houseOwner": overlay.houseOwner,
            "point": overlay.point,
            "sign": overlay.sign,
            "house": overlay.house,
        },
        knowledgeIds=overlay.knowledgeIds,
    )


def composite_aspect_fact(aspect, settings) -> ContentFactPacket:
    return ContentFactPacket(
        surface="composite",
        eventType="composite-aspect",
        headline=f"Composite {aspect.from_} {aspect.type} {aspect.to}",
        priority=aspect.strength or 70,
        timeSensitivity="timeless",
        houseSystem=HouseSystem.whole_sign,
        zodiac=settings.zodiac,
        facts={
            "type": "composite_aspect",
            "from": aspect.from_,
            "to": aspect.to,
            "aspect": aspect.type,
            "orb": aspect.orb,
            "strength": aspect.strength,
        },
        knowledgeIds=[
            f"composite-{aspect.from_.lower().replace(' ', '-')}-{aspect.type}-{aspect.to.lower().replace(' ', '-')}",
            *aspect.knowledgeIds,
        ],
    )


def relationship_facts(synastry, composite, settings, limit: int = 8) -> List[ContentFactPacket]:
    facts: List[ContentFactPacket] = []
    facts.extend(synastry_contact_fact(contact, settings) for contact in synastry.contacts[:4])
    facts.extend(house_overlay_fact(overlay, settings) for overlay in synastry.houseOverlays[:2])
    facts.extend(composite_aspect_fact(aspect, settings) for aspect in composite.aspects[:2])
    return facts[:limit]
