from datetime import datetime, timezone
from typing import List

from tldrastro_api.models import (
    AppResponseContract,
    ChartMetadata,
    CompositeRequest,
    ContentFactPacket,
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


def _fact_id(fact: ContentFactPacket) -> str:
    if fact.knowledgeIds:
        return fact.knowledgeIds[0]
    return f"{fact.surface}:{fact.eventType}:{fact.headline}".lower().replace(" ", "-")


def _app_contract(themes: List[RelationshipTheme], facts: List[ContentFactPacket]) -> AppResponseContract:
    top_theme = themes[0] if themes else None
    headline = top_theme.label if top_theme else "Relationship comparison"
    summary = (
        f"The strongest relationship theme is {top_theme.label}. "
        f"The response includes synastry contacts, composite aspects, and {len(facts)} content facts."
        if top_theme
        else "The response includes synastry contacts, composite aspects, and content-ready facts."
    )
    key_factors = [theme.label for theme in themes[:5]]
    relationship_tags = ["relationship-compare", "synastry", "composite"]
    if top_theme:
        relationship_tags.append(top_theme.source)
    confidence = min(96, 72 + min(16, len(themes) * 2) + min(8, len(facts)))
    return AppResponseContract(
        headline=headline,
        summary=summary,
        keyFactors=key_factors,
        timingTags=[],
        relationshipTags=list(dict.fromkeys(relationship_tags)),
        confidence=confidence,
        contentFactIds=[_fact_id(fact) for fact in facts],
    )


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
    themes = _relationship_themes(synastry, composite)
    return RelationshipCompareResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(dict.fromkeys(warnings)),
        ),
        app=_app_contract(themes, facts),
        synastry=synastry,
        composite=composite,
        relationshipThemes=themes,
        contentFacts=facts,
    )
