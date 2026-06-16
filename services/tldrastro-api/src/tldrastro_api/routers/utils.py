from fastapi import APIRouter

from tldrastro_api.models import TimezoneRequest, TimezoneResponse
from tldrastro_api.services.timezone import resolve_timezone

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post("/timezone", response_model=TimezoneResponse)
def timezone_lookup(request: TimezoneRequest):
    return resolve_timezone(request)

