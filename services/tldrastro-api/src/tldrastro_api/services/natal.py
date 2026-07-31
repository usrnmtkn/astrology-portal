from datetime import datetime, timezone
from typing import List

import swisseph as swe

from tldrastro_api.models import ChartMetadata, NatalChartRequest, NatalChartResponse, Zodiac
from tldrastro_api.services.chart import (
    CANONICAL_HOUSE_SYSTEM,
    SIGN_RULERS,
    angle_positions,
    calculate_aspects,
    calculate_positions,
    configure_ephemeris,
    house_cusps,
    julian_day_for,
    resolve_datetime,
)
from tldrastro_api.services.ephemeris import ephemeris_provenance


def calculate_natal_chart(request: NatalChartRequest) -> NatalChartResponse:
    subject = request.subject
    warnings: List[str] = []
    if subject.settings.zodiac == Zodiac.sidereal:
        warnings.append("Sidereal mode is accepted by the contract but not fully configured yet.")

    configure_ephemeris(subject.settings)
    utc_datetime = resolve_datetime(
        subject,
        warnings,
        "Birth time is unknown; chart calculated at local noon.",
    )
    julian_day = julian_day_for(utc_datetime)
    cusps, ascmc = house_cusps(julian_day, subject)
    positions = calculate_positions(julian_day, subject.settings, cusps, warnings)
    angles = angle_positions(ascmc, cusps)
    ascendant = angles.get("Ascendant")
    chart_ruler = SIGN_RULERS.get(ascendant.sign) if ascendant else None

    return NatalChartResponse(
        metadata=ChartMetadata(
            houseSystem=CANONICAL_HOUSE_SYSTEM,
            zodiac=subject.settings.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=warnings,
            ephemeris=ephemeris_provenance(swe),
        ),
        subjectName=subject.name,
        positions=positions,
        angles=angles,
        houseCusps=[round(cusp, 6) for cusp in cusps],
        aspects=calculate_aspects(positions, subject.settings, julian_day),
        chartRuler=chart_ruler,
        sect=None,
        dignitySummary={},
        contentFacts=[],
    )
