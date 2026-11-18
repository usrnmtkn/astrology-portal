import hashlib
import json
from datetime import datetime, timezone

import swisseph as swe

from tldrastro_api.models import (
    ChartCalculationProvenance,
    ChartMetadata,
    NatalChartRequest,
    NatalChartResponse,
    Zodiac,
)
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

CANONICAL_NATAL_PROVENANCE_SCHEMA = "canonical-natal-v2"


def _digest(value) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _display_position(position) -> dict:
    """Project a calculated position to the arcminute contract reports expose."""
    return {
        "point": position.point,
        "sign": position.sign,
        "degree": position.degree,
        "minute": position.minute,
        "house": position.house,
        "motion": position.motion,
    }


def _display_house_cusp(longitude: float, house: int) -> dict:
    total_minutes = round((longitude % 360.0) * 60) % (360 * 60)
    sign_index = total_minutes // (30 * 60)
    sign_minutes = total_minutes % (30 * 60)
    degree = sign_minutes // 60
    minute = sign_minutes % 60
    return {"house": house, "signIndex": sign_index, "degree": degree, "minute": minute}


def canonical_natal_provenance(
    response: NatalChartResponse,
    utc_datetime,
    subject,
) -> ChartCalculationProvenance:
    """Hash semantic report facts, while retaining raw engine metadata outside the hash."""
    ephemeris = response.metadata.ephemeris
    if ephemeris is None:
        raise RuntimeError("CANONICAL_NATAL_PROVENANCE_REQUIRED: ephemeris provenance is required.")
    source = subject.location.coordinateSource
    canonical_input = {
        "schemaVersion": CANONICAL_NATAL_PROVENANCE_SCHEMA,
        "utc": utc_datetime.isoformat(),
        "location": {
            "label": subject.location.label,
            "latitude": round(subject.location.latitude, 6),
            "longitude": round(subject.location.longitude, 6),
            "timeZone": subject.location.timeZone,
            "coordinateSource": source.model_dump(mode="json") if source else None,
        },
        "settings": subject.settings.model_dump(mode="json", exclude_none=True),
        "houseSystem": CANONICAL_HOUSE_SYSTEM.value,
        "ephemeris": {
            "library": ephemeris.library,
            "libraryVersion": ephemeris.libraryVersion,
            "actualEngine": ephemeris.actualEngine,
        },
    }
    canonical_result = {
        "positions": sorted(
            (_display_position(position) for position in response.positions),
            key=lambda value: value["point"],
        ),
        "angles": [_display_position(position) for _, position in sorted(response.angles.items())],
        "houseCusps": [
            _display_house_cusp(longitude, index)
            for index, longitude in enumerate(response.houseCusps, start=1)
        ],
        "aspects": sorted(
            (
                {
                    "from": aspect.from_,
                    "to": aspect.to,
                    "type": aspect.type,
                    "applying": aspect.applying,
                    "phase": aspect.phase,
                    "strength": aspect.strength,
                    "fromHouse": aspect.fromHouse,
                    "toHouse": aspect.toHouse,
                    "conditions": aspect.conditions.model_dump(mode="json"),
                }
                for aspect in response.aspects
            ),
            key=lambda value: (value["from"], value["to"], value["type"]),
        ),
        "chartRuler": response.chartRuler,
        "sect": response.sect,
    }
    input_hash = _digest(canonical_input)
    result_hash = _digest(canonical_result)
    return ChartCalculationProvenance(
        inputHash=input_hash,
        resultHash=result_hash,
        provenanceHash=_digest(
            {
                "schemaVersion": CANONICAL_NATAL_PROVENANCE_SCHEMA,
                "inputHash": input_hash,
                "resultHash": result_hash,
            }
        ),
    )


def calculate_natal_chart(request: NatalChartRequest) -> NatalChartResponse:
    subject = request.subject
    warnings: list[str] = []
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
    response.metadata.chartProvenance = canonical_natal_provenance(response, utc_datetime, subject)
    return response
