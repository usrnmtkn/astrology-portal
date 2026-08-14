import hashlib
import json
from datetime import datetime, timezone
from typing import List

import swisseph as swe

from tldrastro_api.models import ChartCalculationProvenance, ChartMetadata, NatalChartRequest, NatalChartResponse, Zodiac
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

    response = NatalChartResponse(
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
    ephemeris = response.metadata.ephemeris
    if ephemeris is None:
        raise RuntimeError("CANONICAL_NATAL_PROVENANCE_REQUIRED: ephemeris provenance is required.")
    canonical_input = {
        "utc": utc_datetime.isoformat(),
        "location": subject.location.model_dump(mode="json", exclude_none=True),
        "settings": subject.settings.model_dump(mode="json", exclude_none=True),
        "houseSystem": CANONICAL_HOUSE_SYSTEM.value,
        "ephemeris": {
            "library": ephemeris.library,
            "libraryVersion": ephemeris.libraryVersion,
            "actualEngine": ephemeris.actualEngine,
            "returnedFlags": ephemeris.returnedFlags,
        },
    }
    canonical_result = {
        "positions": [position.model_dump(mode="json", exclude_none=True) for position in response.positions],
        "angles": {key: value.model_dump(mode="json", exclude_none=True) for key, value in sorted(response.angles.items())},
        "houseCusps": response.houseCusps,
        "aspects": [aspect.model_dump(mode="json", by_alias=True, exclude_none=True) for aspect in response.aspects],
    }
    def digest(value) -> str:
        return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

    input_hash = digest(canonical_input)
    result_hash = digest(canonical_result)
    response.metadata.chartProvenance = ChartCalculationProvenance(
        inputHash=input_hash,
        resultHash=result_hash,
        provenanceHash=digest({"inputHash": input_hash, "resultHash": result_hash}),
    )
    return response
