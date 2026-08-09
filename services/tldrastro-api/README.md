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

The API test and production runtime is Python 3.11. PySwissEph is pinned in
`pyproject.toml` because changes to its calculation data can move contacts
across aspect-orb boundaries.

Then open:

- API: `http://localhost:8000`
- Health: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`
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

## Tests

Run the full API suite from the service directory:

```bash
python -m pytest
```

CI downloads checksum-pinned planet, Moon, and main-asteroid data files from
the official Swiss Ephemeris repository and validates a Swiss-only profile.
The main-asteroid file is required by true (osculating) Black Moon Lilith.
To run the same profile locally, configure both values:

```bash
TLDR_ASTRO_EPHEMERIS_PATH=/path/to/ephemeris \
TLDR_ASTRO_TEST_EPHEMERIS_ENGINES=swiss \
python -m pytest
```

Production requires the Swiss-only profile. `/ready` probes the Sun, Moon, and
true Black Moon Lilith and rejects fallback when `TLDR_ASTRO_EPHEMERIS_PATH` is
configured, including when the Lilith-specific data file is absent.

## Timezone Lookup

The API resolves birth-location coordinates to IANA timezone IDs through
`POST /utils/timezone`. For production, set a server-only Google Time Zone API
key:

```bash
GOOGLE_MAPS_TIMEZONE_API_KEY=...
```

The aliases `GOOGLE_TIMEZONE_API_KEY` and `GOOGLE_MAPS_API_KEY` are also
accepted. Do not use a `VITE_` prefix for this key; it must stay server-side.

When the key is present, the API asks Google first. If Google is unavailable,
the API falls back to the bundled `timezonefinder`/`tzdata` dependency. If both
fail, chart creation fails instead of guessing or silently using UTC.

To verify a local key without printing it:

```bash
GOOGLE_MAPS_TIMEZONE_API_KEY=... node scripts/verify-google-timezone-key.mjs
```

## Production Deployment

The service is deployable as a standalone Docker web service. Build from this
directory:

```bash
cd services/tldrastro-api
docker build -t tldrastro-api .
docker run --rm -p 8000:8000 \
  -e TLDR_ASTRO_ALLOWED_ORIGINS=https://tldrastro.vercel.app \
  -e TLDR_ASTRO_EPHEMERIS_PATH=/opt/swisseph \
  -v /secure/path/to/swisseph:/opt/swisseph:ro \
  tldrastro-api
```

Required production configuration:

- `TLDR_ASTRO_ALLOWED_ORIGINS`: comma-separated web origins that may call the API.
- `TLDR_ASTRO_EPHEMERIS_PATH`: mounted directory containing licensed Swiss Ephemeris files.
- `PORT`: optional; hosting providers usually set this automatically.

Keep Swiss Ephemeris data files out of git. Mount them as a private disk, secret
file volume, or host directory depending on the provider.

Health checks:

- `/health` reports the requested and actual calculation engines, fallback
  state, data-path availability, and fixed Sun/Moon calculation probes.
- `/ready` returns `200` only when the ephemeris probes succeed. If
  `TLDR_ASTRO_EPHEMERIS_PATH` is configured, readiness also requires the
  returned calculation flags to confirm that Swiss Ephemeris—not the built-in
  Moshier fallback—actually answered.
- Chart response metadata includes ephemeris provenance captured from the
  flags returned by the calculations for that request.

### Google Cloud Run

For production traffic, Cloud Run is the recommended first deployment target.
Use [CLOUD_RUN.md](./CLOUD_RUN.md) for the full setup.

The included `cloudbuild.yaml` builds the API image, pushes it to Artifact
Registry, deploys Cloud Run, mounts a read-only Cloud Storage bucket at
`/opt/swisseph`, and configures `/ready` as the startup probe.

### Render

`render.yaml` is included as a starter blueprint for a Docker web service when
`services/tldrastro-api` is used as the service root. Configure these values in
Render rather than committing secrets or local paths:

```bash
TLDR_ASTRO_ALLOWED_ORIGINS=https://tldrastro.vercel.app,https://www.tldrastro.com
TLDR_ASTRO_EPHEMERIS_PATH=/opt/swisseph
```

Mount licensed Swiss Ephemeris files at the same path used by
`TLDR_ASTRO_EPHEMERIS_PATH`. Use `/ready` as the health check path.

### Web App Production URL

After the API is deployed, configure the web app build environment:

```bash
VITE_TLDRASTRO_API_URL=https://your-api-host.example.com
```

Then rebuild/redeploy the web app so the browser bundle points at the live API.

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
