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

The service uses Swiss Ephemeris for natal, sky, transit, timing, synastry, and
composite calculations. Keep licensed ephemeris data outside git and point the
runtime at it with `TLDR_ASTRO_EPHEMERIS_PATH`.

## First Endpoints

- `GET /health`
- `GET /reference/config`
- `GET /houses/systems`
- `POST /utils/timezone`
- `POST /chart/natal`
- `POST /chart/transits`
- `POST /relationship/synastry`
- `POST /relationship/composite`
- `POST /relationship/compare`
- `POST /sky/current`
- `POST /timing/profections`
- `POST /timing/personal`

## App-Facing Contracts

Timing and relationship responses include an `app` object for the TLDR Astro
frontend and content pipeline:

```json
{
  "headline": "Cancer 4H year",
  "summary": "Annual profection activates the 4 house, Cancer, and Moon.",
  "keyFactors": ["Annual house: 4", "Annual sign: Cancer"],
  "timingTags": ["personal-timing", "annual-profection", "house-4"],
  "relationshipTags": [],
  "confidence": 86,
  "contentFactIds": ["timing-profection-house-4"]
}
```

Use `app` for cards, previews, notifications, and prose prompts. Use the raw
calculation fields for charts, tables, and detailed drill-downs.

## Frontend Integration

Run the API and Vite app side by side:

```bash
# terminal 1
cd services/tldrastro-api
source .venv/bin/activate
uvicorn tldrastro_api.main:app --reload --port 8000

# terminal 2
cd apps/web
npm run dev
```

Add the API URL to `apps/web/.env.local`:

```bash
VITE_TLDRASTRO_API_URL=http://127.0.0.1:8000
```

The web app client lives at `apps/web/src/services/tldrastroApi.ts` and exposes:

- `getPersonalTiming`
- `compareRelationship`
- `getSynastry`
- `getComposite`
