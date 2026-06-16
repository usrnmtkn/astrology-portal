from fastapi import APIRouter

from tldrastro_api.models import NatalChartRequest, NatalChartResponse
from tldrastro_api.services.natal import calculate_natal_chart

router = APIRouter(tags=["charts"])


@router.post("/chart/natal", response_model=NatalChartResponse)
def natal_chart(request: NatalChartRequest):
    return calculate_natal_chart(request)
