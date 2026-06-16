from fastapi import APIRouter

from tldrastro_api.models import (
    NatalChartRequest,
    NatalChartResponse,
    TransitChartRequest,
    TransitChartResponse,
)
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.transits import calculate_transits

router = APIRouter(tags=["charts"])


@router.post("/chart/natal", response_model=NatalChartResponse)
def natal_chart(request: NatalChartRequest):
    return calculate_natal_chart(request)


@router.post("/chart/transits", response_model=TransitChartResponse)
def transit_chart(request: TransitChartRequest):
    return calculate_transits(request)
