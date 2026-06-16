import os
from functools import lru_cache
from typing import List, Optional

from pydantic import BaseModel


class Settings(BaseModel):
    service_name: str = "tldrastro-api"
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
        ephemeris_path=os.getenv("TLDR_ASTRO_EPHEMERIS_PATH") or None,
        allowed_origins=_csv_env(
            "TLDR_ASTRO_ALLOWED_ORIGINS",
            ["http://localhost:5173", "http://127.0.0.1:5173"],
        ),
    )

