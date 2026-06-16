from fastapi import APIRouter

from tldrastro_api.models import (
    PersonalTimingRequest,
    PersonalTimingResponse,
    ProfectionsRequest,
    ProfectionsResponse,
)
from tldrastro_api.services.personal_timing import calculate_personal_timing
from tldrastro_api.services.profections import calculate_profections

router = APIRouter(prefix="/timing", tags=["timing"])


@router.post("/profections", response_model=ProfectionsResponse)
def profections(request: ProfectionsRequest):
    return calculate_profections(request)


@router.post("/personal", response_model=PersonalTimingResponse)
def personal_timing(request: PersonalTimingRequest):
    return calculate_personal_timing(request)
