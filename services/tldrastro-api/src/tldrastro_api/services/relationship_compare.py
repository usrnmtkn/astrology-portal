from datetime import datetime, timezone
from typing import List

from tldrastro_api.models import (
    ChartMetadata,
    CompositeRequest,
    RelationshipCompareRequest,
    RelationshipCompareResponse,
    RelationshipTheme,
    SynastryRequest,
)
from tldrastro_api.services.composite import calculate_composite
from tldrastro_api.services.relationship_facts import relationship_facts
from tldrastro_api.services.synastry import calculate_synastry


def _theme_from_synastry(contact) -> RelationshipTheme:
    return RelationshipTheme(
        id=f"theme-{contact.id}",
        label=f"{contact.fromPoint} {contact.aspect} {contact.toPoint}",
        score=contact.score,
        source="synastry",
        knowledgeIds=contact.knowledgeIds,
    )


def _theme_from_composite(aspect) -> RelationshipTheme:
    strength = aspect.strength or 0
    return RelationshipTheme(
        id=f"theme-composite-{aspect.from_.lower()}-{aspect.type}-{aspect.to.lower()}".replace(" ", "-"),
        label=f"Composite {aspect.from_} {aspect.type} {aspect.to}",
        score=strength + 20,
        source="composite",
        knowledgeIds=[
            f"composite-{aspect.from_.lower().replace(' ', '-')}-{aspect.type}-{aspect.to.lower().replace(' ', '-')}",
            *aspect.knowledgeIds,
        ],
    )


def _relationship_themes(synastry, composite) -> List[RelationshipTheme]:
    themes = [
        *[_theme_from_synastry(contact) for contact in synastry.contacts[:6]],
        *[_theme_from_composite(aspect) for aspect in composite.aspects[:4]],
    ]
    return sorted(themes, key=lambda theme: (-theme.score, theme.id))[:8]


def calculate_relationship_compare(request: RelationshipCompareRequest) -> RelationshipCompareResponse:
    synastry = calculate_synastry(
        SynastryRequest(
            personA=request.personA,
            personB=request.personB,
            settings=request.settings,
            includeContentFacts=request.includeContentFacts,
        )
    )
    composite = calculate_composite(
        CompositeRequest(
            personA=request.personA,
            personB=request.personB,
            settings=request.settings,
            includeContentFacts=request.includeContentFacts,
        )
    )
    facts = relationship_facts(synastry, composite, request.settings) if request.includeContentFacts else []
    warnings = [
        *synastry.metadata.inputWarnings,
        *composite.metadata.inputWarnings,
    ]
    return RelationshipCompareResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(dict.fromkeys(warnings)),
        ),
        synastry=synastry,
        composite=composite,
        relationshipThemes=_relationship_themes(synastry, composite),
        contentFacts=facts,
    )

