from datetime import datetime, timezone
from typing import List

from tldrastro_api.models import (
    AppResponseContract,
    ChartMetadata,
    ContentFactPacket,
    PersonalTimingRequest,
    PersonalTimingResponse,
    ProfectionsRequest,
    TimingBoostedTransit,
    TransitChartRequest,
    TransitHit,
)
from tldrastro_api.services.profections import calculate_profections
from tldrastro_api.services.transits import calculate_transits


def _date_from_datetime(value) -> str:
    return value.date


def _boost_reasons(hit: TransitHit, annual, monthly) -> List[str]:
    reasons: List[str] = []
    if hit.transitPlanet == annual.ruler:
        reasons.append(f"transiting {hit.transitPlanet} is Lord of the Year")
    if hit.natalPoint == annual.ruler:
        reasons.append(f"natal {hit.natalPoint} is Lord of the Year")
    if hit.natalPoint in annual.activatedNatalPlanets:
        reasons.append(f"natal {hit.natalPoint} is activated by annual profection")
    if hit.natalPoint in monthly.activatedNatalPlanets:
        reasons.append(f"natal {hit.natalPoint} is activated by monthly profection")
    if hit.natalHouse == annual.house:
        reasons.append(f"natal house {hit.natalHouse} is the annual profected house")
    if hit.transitHouse == annual.house:
        reasons.append(f"transit is moving through annual profected house {hit.transitHouse}")
    if hit.natalSign == annual.sign:
        reasons.append(f"natal {hit.natalPoint} is in annual profected sign {annual.sign}")
    if hit.natalSign == monthly.sign:
        reasons.append(f"natal {hit.natalPoint} is in monthly profected sign {monthly.sign}")
    return reasons


def _boosted_score(base_score: int, reasons: List[str]) -> int:
    return base_score + min(40, len(reasons) * 8)


def _boost_transits(hits: List[TransitHit], annual, monthly) -> List[TimingBoostedTransit]:
    boosted = []
    for hit in hits:
        reasons = _boost_reasons(hit, annual, monthly)
        boosted.append(
            TimingBoostedTransit(
                hit=hit,
                baseScore=hit.score,
                boostedScore=_boosted_score(hit.score, reasons),
                boostReasons=reasons,
            )
        )
    return sorted(
        boosted,
        key=lambda item: (-item.boostedScore, -len(item.boostReasons), item.hit.orb),
    )


def _content_facts(request: PersonalTimingRequest, profections, boosted) -> List[ContentFactPacket]:
    top_boost = boosted[0] if boosted else None
    facts = [
        ContentFactPacket(
            surface="you",
            eventType="time-lord-period",
            headline=(
                f"{profections.annual.sign} annual profection, "
                f"ruled by {profections.annual.ruler}"
            ),
            priority=85,
            timeSensitivity="active-now",
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            facts={
                "type": "annual_profection",
                "age": profections.age,
                "house": profections.annual.house,
                "sign": profections.annual.sign,
                "ruler": profections.annual.ruler,
                "startsAt": profections.annual.startsAt,
                "endsAt": profections.annual.endsAt,
                "activatedNatalPlanets": profections.annual.activatedNatalPlanets,
            },
            knowledgeIds=[
                f"timing-profection-house-{profections.annual.house}",
                f"timing-profection-ruler-{profections.annual.ruler.lower()}",
            ],
        )
    ]

    if top_boost:
        facts.append(
            ContentFactPacket(
                surface="you",
                eventType="timing-boosted-transit",
                headline=(
                    f"{top_boost.hit.transitPlanet} {top_boost.hit.aspect} "
                    f"{top_boost.hit.natalPoint}"
                ),
                priority=min(100, top_boost.boostedScore),
                timeSensitivity="active-now",
                houseSystem=request.settings.houseSystem,
                zodiac=request.settings.zodiac,
                facts={
                    "type": "timing_boosted_transit",
                    "hit": top_boost.hit.model_dump(by_alias=True),
                    "baseScore": top_boost.baseScore,
                    "boostedScore": top_boost.boostedScore,
                    "boostReasons": top_boost.boostReasons,
                },
                knowledgeIds=top_boost.hit.knowledgeIds,
            )
        )

    return facts


def _fact_id(fact: ContentFactPacket) -> str:
    if fact.knowledgeIds:
        return fact.knowledgeIds[0]
    return f"{fact.surface}:{fact.eventType}:{fact.headline}".lower().replace(" ", "-")


def _ordinal_house(house: int) -> str:
    if 10 < house % 100 < 14:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(house % 10, "th")
    return f"{house}{suffix}"


def _app_contract(profections, boosted, facts: List[ContentFactPacket]) -> AppResponseContract:
    top_boost = boosted[0] if boosted else None
    headline = f"{profections.annual.sign} {profections.annual.house}H year"
    summary = (
        f"Annual profection activates the {_ordinal_house(profections.annual.house)} house, "
        f"{profections.annual.sign}, and {profections.annual.ruler}."
    )
    key_factors = [
        f"Annual house: {profections.annual.house}",
        f"Annual sign: {profections.annual.sign}",
        f"Lord of the Year: {profections.annual.ruler}",
    ]
    if profections.annual.activatedNatalPlanets:
        key_factors.append(
            "Activated natal planets: "
            + ", ".join(profections.annual.activatedNatalPlanets)
        )
    if top_boost:
        key_factors.append(
            f"Top boosted transit: {top_boost.hit.transitPlanet} "
            f"{top_boost.hit.aspect} {top_boost.hit.natalPoint}"
        )
        summary += (
            f" The strongest timing signal is {top_boost.hit.transitPlanet} "
            f"{top_boost.hit.aspect} {top_boost.hit.natalPoint}."
        )
    timing_tags = [
        "personal-timing",
        "annual-profection",
        f"house-{profections.annual.house}",
        profections.annual.sign.lower(),
        profections.annual.ruler.lower().replace(" ", "-"),
    ]
    if top_boost:
        timing_tags.extend(
            [
                "boosted-transit",
                top_boost.hit.transitPlanet.lower().replace(" ", "-"),
                top_boost.hit.aspect,
            ]
        )
    confidence = min(95, 70 + len(facts) * 5 + min(10, len(boosted)))
    return AppResponseContract(
        headline=headline,
        summary=summary,
        keyFactors=key_factors,
        timingTags=list(dict.fromkeys(timing_tags)),
        relationshipTags=[],
        confidence=confidence,
        contentFactIds=[_fact_id(fact) for fact in facts],
    )


def calculate_personal_timing(request: PersonalTimingRequest) -> PersonalTimingResponse:
    profections = calculate_profections(
        ProfectionsRequest(
            natalSubject=request.natalSubject,
            targetDate=_date_from_datetime(request.targetDatetime),
            respectHouseSystem=False,
            includeContentFacts=request.includeContentFacts,
        )
    )
    transits = calculate_transits(
        TransitChartRequest(
            natalSubject=request.natalSubject,
            transitDatetime=request.targetDatetime,
            transitLocation=request.targetLocation,
            settings=request.settings,
            includeContentFacts=request.includeContentFacts,
        )
    )
    top_transits = transits.hits[: request.maxTransits]
    boosted = _boost_transits(top_transits, profections.annual, profections.monthly)
    content_facts = _content_facts(request, profections, boosted) if request.includeContentFacts else []
    warnings = [
        *transits.metadata.inputWarnings,
        *profections.metadata.inputWarnings,
    ]

    return PersonalTimingResponse(
        metadata=ChartMetadata(
            houseSystem=request.settings.houseSystem,
            zodiac=request.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=list(dict.fromkeys(warnings)),
        ),
        app=_app_contract(profections, boosted, content_facts),
        natal=transits.natal,
        currentSky=transits.transitChart,
        profections=profections,
        topTransits=top_transits,
        timingBoostedTransits=boosted,
        activatedHouse=profections.annual.house,
        activatedSign=profections.annual.sign,
        activatedRuler=profections.annual.ruler,
        activatedNatalPlanets=profections.annual.activatedNatalPlanets,
        contentFacts=content_facts,
    )
