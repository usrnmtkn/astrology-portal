from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tldrastro_api.config import get_settings
from tldrastro_api.routers import charts, health, reference, utils


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TLDR Astro API",
        description="Calculation and astrology-facts service for TLDR Astro.",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(reference.router)
    app.include_router(utils.router)
    app.include_router(charts.router)
    return app


app = create_app()
