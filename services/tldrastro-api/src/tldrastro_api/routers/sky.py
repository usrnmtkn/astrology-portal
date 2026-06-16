from fastapi import APIRouter

from tldrastro_api.models import SkyCurrentRequest, SkyCurrentResponse
from tldrastro_api.services.sky import calculate_current_sky

router = APIRouter(prefix="/sky", tags=["sky"])


@router.post("/current", response_model=SkyCurrentResponse)
def current_sky(request: SkyCurrentRequest):
    return calculate_current_sky(request)

