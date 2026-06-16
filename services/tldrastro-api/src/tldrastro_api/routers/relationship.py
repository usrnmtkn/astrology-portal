from fastapi import APIRouter

from tldrastro_api.models import SynastryRequest, SynastryResponse
from tldrastro_api.services.synastry import calculate_synastry

router = APIRouter(prefix="/relationship", tags=["relationship"])


@router.post("/synastry", response_model=SynastryResponse)
def synastry(request: SynastryRequest):
    return calculate_synastry(request)

