from datetime import datetime, timezone

from fastapi import APIRouter

from tldrastro_api.config import get_settings
from tldrastro_api.services.ephemeris import ephemeris_status

router = APIRouter(tags=["platform"])


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "ok": True,
        "service": settings.service_name,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "ephemeris": ephemeris_status(settings.ephemeris_path),
    }

