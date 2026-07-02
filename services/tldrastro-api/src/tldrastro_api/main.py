from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tldrastro_api.config import get_settings
from tldrastro_api.errors import register_error_handlers
from tldrastro_api.routers import charts, health, reference, relationship, sky, timing, utils


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TLDR Astro API",
        description="Calculation and astrology-facts service for TLDR Astro.",
        version=settings.service_version,
    )
    register_error_handlers(app)
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
    app.include_router(sky.router)
    app.include_router(timing.router)
    app.include_router(relationship.router)
    app.include_router(charts.router)
    return app


app = create_app()
