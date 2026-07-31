from calendar import monthrange
from datetime import date, datetime, timezone
from typing import List, Tuple

from tldrastro_api.models import (
    ChartMetadata,
    NatalChartRequest,
    ProfectionPeriod,
    ProfectionsRequest,
    ProfectionsResponse,
)
from tldrastro_api.services.chart import SIGN_RULERS, SIGNS
from tldrastro_api.services.natal import calculate_natal_chart


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _birth_date(request: ProfectionsRequest) -> date:
    return _parse_date(request.natalSubject.datetime.date)


def _age_on(birth_date: date, target_date: date) -> int:
    age = target_date.year - birth_date.year
    if (target_date.month, target_date.day) < (birth_date.month, birth_date.day):
        age -= 1
    return max(age, 0)


def _birthday_for_year(birth_date: date, year: int) -> date:
    day = min(birth_date.day, monthrange(year, birth_date.month)[1])
    return date(year, birth_date.month, day)


def _annual_bounds(birth_date: date, target_date: date) -> Tuple[date, date]:
    start = _birthday_for_year(birth_date, target_date.year)
    if start > target_date:
        start = _birthday_for_year(birth_date, target_date.year - 1)
    end = _birthday_for_year(birth_date, start.year + 1)
    return start, end


def _month_add(start: date, months: int) -> date:
    month_index = start.month - 1 + months
    year = start.year + month_index // 12
    month = month_index % 12 + 1
    day = min(start.day, monthrange(year, month)[1])
    return date(year, month, day)


def _monthly_bounds(annual_start: date, target_date: date) -> Tuple[int, date, date]:
    for index in range(12):
        start = _month_add(annual_start, index)
        end = _month_add(annual_start, index + 1)
        if start <= target_date < end:
            return index, start, end
    return 11, _month_add(annual_start, 11), _month_add(annual_start, 12)


def _sign_index(sign: str) -> int:
    return [name for name, _ in SIGNS].index(sign)


def _activated_house(start_house: int, offset: int) -> int:
    return ((start_house - 1 + offset) % 12) + 1


def _activated_sign(ascendant_sign: str, offset: int) -> str:
    signs = [name for name, _ in SIGNS]
    return signs[(_sign_index(ascendant_sign) + offset) % 12]


def _natal_planets_in_sign(natal_chart, sign: str) -> List[str]:
    return [
        position.point
        for position in natal_chart.positions
        if position.sign == sign and position.point not in {"North Node", "True Node", "Lilith"}
    ]


def _period(
    level: str,
    age: int,
    house: int,
    sign: str,
    starts_at: date,
    ends_at: date,
    natal_chart,
) -> ProfectionPeriod:
    return ProfectionPeriod(
        level=level,
        age=age,
        house=house,
        sign=sign,
        ruler=SIGN_RULERS[sign],
        startsAt=starts_at.isoformat(),
        endsAt=ends_at.isoformat(),
        activatedNatalPlanets=_natal_planets_in_sign(natal_chart, sign),
    )


def calculate_profections(request: ProfectionsRequest) -> ProfectionsResponse:
    natal_chart = calculate_natal_chart(
        NatalChartRequest(
            subject=request.natalSubject,
            includeContentFacts=request.includeContentFacts,
        )
    )
    warnings = list(natal_chart.metadata.inputWarnings)
    if request.respectHouseSystem:
        warnings.append("respectHouseSystem is accepted, but profections are pinned to whole-sign in v1.")

    ascendant = natal_chart.angles.get("Ascendant")
    if not ascendant:
        raise ValueError("Ascendant is required for profections.")

    birth_date = _birth_date(request)
    target_date = _parse_date(request.targetDate)
    age = _age_on(birth_date, target_date)
    annual_start, annual_end = _annual_bounds(birth_date, target_date)
    annual_offset = age % 12
    annual_house = _activated_house(1, annual_offset)
    annual_sign = _activated_sign(ascendant.sign, annual_offset)
    month_offset, monthly_start, monthly_end = _monthly_bounds(annual_start, target_date)
    monthly_house = _activated_house(annual_house, month_offset)
    monthly_sign = _activated_sign(annual_sign, month_offset)

    annual = _period(
        "annual",
        age,
        annual_house,
        annual_sign,
        annual_start,
        annual_end,
        natal_chart,
    )
    monthly = _period(
        "monthly",
        age,
        monthly_house,
        monthly_sign,
        monthly_start,
        monthly_end,
        natal_chart,
    )

    return ProfectionsResponse(
        metadata=ChartMetadata(
            houseSystem=natal_chart.metadata.houseSystem,
            zodiac=natal_chart.metadata.zodiac,
            calculatedAt=datetime.now(timezone.utc).isoformat(),
            inputWarnings=warnings,
            ephemeris=natal_chart.metadata.ephemeris,
        ),
        natal=natal_chart,
        age=age,
        annual=annual,
        monthly=monthly,
        activatedNatalPlanets=annual.activatedNatalPlanets,
        contentFacts=[],
    )
