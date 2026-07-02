import os
from functools import lru_cache
from typing import List, Optional

from pydantic import BaseModel


class Settings(BaseModel):
    service_name: str = "tldrastro-api"
    service_version: str = "0.1.0"
    environment: str = "development"
    build_commit: Optional[str] = None
    build_time: Optional[str] = None
    cloud_run_service: Optional[str] = None
    cloud_run_revision: Optional[str] = None
    cloud_run_configuration: Optional[str] = None
    ephemeris_path: Optional[str] = None
    allowed_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


def _csv_env(name: str, fallback: List[str]) -> List[str]:
    raw = os.getenv(name)
    if not raw:
        return fallback
    return [item.strip() for item in raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        service_version=os.getenv("TLDR_ASTRO_SERVICE_VERSION", "0.1.0"),
        environment=(
            os.getenv("TLDR_ASTRO_ENV")
            or os.getenv("APP_ENV")
            or os.getenv("ENVIRONMENT")
            or "development"
        ),
        build_commit=(
            os.getenv("TLDR_ASTRO_BUILD_COMMIT")
            or os.getenv("GIT_SHA")
            or os.getenv("COMMIT_SHA")
            or os.getenv("VERCEL_GIT_COMMIT_SHA")
        ),
        build_time=os.getenv("TLDR_ASTRO_BUILD_TIME"),
        cloud_run_service=os.getenv("K_SERVICE"),
        cloud_run_revision=os.getenv("K_REVISION"),
        cloud_run_configuration=os.getenv("K_CONFIGURATION"),
        ephemeris_path=os.getenv("TLDR_ASTRO_EPHEMERIS_PATH") or None,
        allowed_origins=_csv_env(
            "TLDR_ASTRO_ALLOWED_ORIGINS",
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        ),
    )
