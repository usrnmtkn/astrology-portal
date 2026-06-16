# TLDR Astro API

FastAPI calculation service for TLDR Astro.

This service owns astrology calculation, timing context, relationship facts, and
content-ready fact packets. The web app keeps accounts, saved charts, UI
rendering, and final prose generation.

## Local Setup

From the repo root:

```bash
cd services/tldrastro-api
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
cp .env.example .env
uvicorn tldrastro_api.main:app --reload --port 8000
```

Then open:

- API: `http://localhost:8000`
- Health: `http://localhost:8000/health`
- OpenAPI docs: `http://localhost:8000/docs`

## Swiss Ephemeris

The Python package dependency is `pyswisseph`, imported as `swisseph`.

Set `TLDR_ASTRO_EPHEMERIS_PATH` to the directory containing Swiss Ephemeris data
files if the runtime cannot locate them automatically:

```bash
TLDR_ASTRO_EPHEMERIS_PATH=/path/to/ephemeris uvicorn tldrastro_api.main:app --reload --port 8000
```

The app currently returns a validated `501 Not Implemented` response for
`POST /chart/natal`. That is intentional for this scaffold: the contract is in
place, and the next step is implementing the Swiss Ephemeris-backed calculation
engine behind it.

## First Endpoints

- `GET /health`
- `GET /reference/config`
- `GET /houses/systems`
- `POST /utils/timezone`
- `POST /chart/natal`
- `POST /sky/current`
