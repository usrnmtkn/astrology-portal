from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from tldrastro_api.config import get_settings
from tldrastro_api.services.ephemeris import ephemeris_status

router = APIRouter(tags=["platform"])


FEATURES = [
    {"id": "chart.natal", "path": "/chart/natal", "method": "POST"},
    {"id": "chart.transits", "path": "/chart/transits", "method": "POST"},
    {"id": "sky.current", "path": "/sky/current", "method": "POST"},
    {"id": "timing.profections", "path": "/timing/profections", "method": "POST"},
    {"id": "timing.personal", "path": "/timing/personal", "method": "POST"},
    {"id": "timing.solar_return", "path": "/timing/solar-return", "method": "POST"},
    {"id": "timing.report_window", "path": "/timing/report-window", "method": "POST"},
    {"id": "relationship.synastry", "path": "/relationship/synastry", "method": "POST"},
    {"id": "relationship.composite", "path": "/relationship/composite", "method": "POST"},
    {"id": "relationship.compare", "path": "/relationship/compare", "method": "POST"},
    {"id": "reference.config", "path": "/reference/config", "method": "GET"},
    {"id": "utils.timezone", "path": "/utils/timezone", "method": "POST"},
]


def _checked_at() -> str:
    return datetime.now(timezone.utc).isoformat()


def _platform_payload():
    settings = get_settings()
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "environment": settings.environment,
        "checkedAt": _checked_at(),
        "build": {
            "commit": settings.build_commit,
            "time": settings.build_time,
        },
        "cloudRun": {
            "service": settings.cloud_run_service,
            "revision": settings.cloud_run_revision,
            "configuration": settings.cloud_run_configuration,
        },
        "cors": {
            "allowedOrigins": settings.allowed_origins,
        },
    }


@router.get("/health")
def health():
    settings = get_settings()
    return {
        "ok": True,
        "service": settings.service_name,
        "checkedAt": _checked_at(),
        "ephemeris": ephemeris_status(settings.ephemeris_path),
    }


@router.get("/ready")
def ready():
    settings = get_settings()
    status = ephemeris_status(settings.ephemeris_path)
    payload = {
        "ok": bool(status.get("ready")),
        "service": settings.service_name,
        "checkedAt": _checked_at(),
        "ephemeris": status,
    }

    if not payload["ok"]:
        raise HTTPException(status_code=503, detail=payload)

    return payload


@router.get("/meta/status")
def meta_status():
    settings = get_settings()
    status = ephemeris_status(settings.ephemeris_path)
    return {
        "ok": bool(status.get("ready")),
        **_platform_payload(),
        "ephemeris": status,
        "features": FEATURES,
    }
