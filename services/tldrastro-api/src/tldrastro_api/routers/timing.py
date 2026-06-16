from fastapi import APIRouter

from tldrastro_api.models import ProfectionsRequest, ProfectionsResponse
from tldrastro_api.services.profections import calculate_profections

router = APIRouter(prefix="/timing", tags=["timing"])


@router.post("/profections", response_model=ProfectionsResponse)
def profections(request: ProfectionsRequest):
    return calculate_profections(request)

