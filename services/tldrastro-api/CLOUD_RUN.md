# Cloud Run Deployment

This guide deploys `tldrastro-api` as a Google Cloud Run service.

## One-Time Setup

Install and authenticate the Google Cloud CLI:

```bash
gcloud auth login
gcloud auth application-default login
```

Set your project and region:

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1
export REPOSITORY=tldrastro
export SERVICE=tldrastro-api
export EPHEMERIS_BUCKET=tldrastro-swisseph

gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"
```

Enable required APIs:

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  storage.googleapis.com
```

Create an Artifact Registry Docker repository:

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="TLDR Astro containers"
```

Create a private Cloud Storage bucket for licensed Swiss Ephemeris files:

```bash
gcloud storage buckets create "gs://$EPHEMERIS_BUCKET" \
  --location="$REGION" \
  --uniform-bucket-level-access
```

Upload the licensed Swiss Ephemeris files:

```bash
gcloud storage cp /path/to/swisseph/* "gs://$EPHEMERIS_BUCKET/"
```

Grant the Cloud Run runtime service account read access to the bucket. Replace
`PROJECT_NUMBER` with your numeric project number:

```bash
export PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
export RUNTIME_SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://$EPHEMERIS_BUCKET" \
  --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT" \
  --role="roles/storage.objectViewer"
```

## Deploy

From the repo root:

```bash
gcloud builds submit . \
  --config services/tldrastro-api/cloudbuild.yaml \
  --substitutions _REGION="$REGION",_REPOSITORY="$REPOSITORY",_SERVICE="$SERVICE",_EPHEMERIS_BUCKET="$EPHEMERIS_BUCKET",_ALLOWED_ORIGINS="https://tldrastro.vercel.app,https://www.tldrastro.com",_MIN_INSTANCES="1",_MAX_INSTANCES="20",_CONCURRENCY="20"
```

The build will:

- build `services/tldrastro-api/Dockerfile`
- push the image to Artifact Registry
- deploy Cloud Run with `/ready` as its startup probe
- set the Cloud Run container port to `8000`
- mount the Swiss Ephemeris bucket read-only at `/opt/swisseph`
- set `TLDR_ASTRO_EPHEMERIS_PATH=/opt/swisseph`

## Verify

Get the service URL:

```bash
export API_URL=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --format="value(status.url)")

curl -fsSL "$API_URL/health"
curl -fsSL "$API_URL/ready"
```

`/ready` should return `"ok": true` and `"ephemeris": { "available": true }`.

## Connect Vercel

In the Vercel project for `apps/web`, set:

```bash
VITE_TLDRASTRO_API_URL=$API_URL
```

Redeploy the web app after setting this value. The browser bundle only receives
new `VITE_` values after a rebuild.

## Scaling Notes

The default Cloud Build substitutions use:

- `min instances`: `1`
- `max instances`: `20`
- `concurrency`: `20`
- `CPU`: `1`
- `memory`: `1Gi`

This is a conservative launch profile. Increase `max instances` for traffic,
reduce `concurrency` if individual calculations become CPU-heavy, and keep at
least one minimum instance if cold starts become visible in the app.
