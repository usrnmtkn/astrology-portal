from fastapi import APIRouter

from tldrastro_api.models import (
    PersonalTimingRequest,
    PersonalTimingResponse,
    ProfectionsRequest,
    ProfectionsResponse,
    ReportWindowRequest,
    ReportWindowResponse,
    SolarReturnRequest,
    SolarReturnResponse,
)
from tldrastro_api.services.personal_timing import calculate_personal_timing
from tldrastro_api.services.profections import calculate_profections
from tldrastro_api.services.report_window import calculate_report_window
from tldrastro_api.services.solar_return import calculate_solar_return

router = APIRouter(prefix="/timing", tags=["timing"])


@router.post("/profections", response_model=ProfectionsResponse)
def profections(request: ProfectionsRequest):
    return calculate_profections(request)


@router.post("/personal", response_model=PersonalTimingResponse)
def personal_timing(request: PersonalTimingRequest):
    return calculate_personal_timing(request)


@router.post("/solar-return", response_model=SolarReturnResponse)
def solar_return(request: SolarReturnRequest):
    return calculate_solar_return(request)


@router.post("/report-window", response_model=ReportWindowResponse)
def report_window(request: ReportWindowRequest):
    return calculate_report_window(request)
