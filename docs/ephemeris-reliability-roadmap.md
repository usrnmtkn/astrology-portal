# Ephemeris Reliability Roadmap

## Phase 1: Actual-engine readiness and provenance

Status: implemented locally.

- `/health` performs fixed Sun and Moon calculations and reports the engine
  returned by `pyswisseph`.
- `/ready` rejects a Moshier fallback when
  `TLDR_ASTRO_EPHEMERIS_PATH` declares that mounted Swiss data should be used.
- Local development without a configured data path remains available but is
  explicitly marked as degraded when Moshier answers.
- Chart metadata records requested engine, actual returned engine or engines,
  library version, data path, returned flags, fallback state, and calculation
  count.

## Phase 2: NASA/JPL shadow verification

Status: implemented.

- The `Ephemeris integrity` GitHub Actions workflow runs daily and can also be
  started manually.
- It uses the existing NASA/JPL Horizons adapter sequentially, respecting the
  service's one-request-at-a-time fair-use requirement.
- Known coverage gaps remain visible as `PARTIAL_WITH_GAPS`, but do not fail
  the monitoring job.
- Any supported-fact discrepancy still fails the job.
- The JSON report, compact Markdown summary, and raw response cache are
  retained as workflow artifacts for 90 days.
- Each run publishes the compact result into the GitHub Actions job summary;
  failed discrepancy runs also emit a visible workflow error annotation.
- The latest result and a dated comment history are persisted in the
  `NASA/JPL ephemeris integrity status` GitHub monitor issue, outside the
  90-day artifact window.
- Pull requests run the `nasa-jpl-freshness` release gate. It requires the
  newest completed main-branch comparison to have passed within 36 hours.
- Failures reopen the persistent monitor issue, assign the configured alert
  recipients, and mention them in the failure update. The repository owner is
  the default recipient; `EPHEMERIS_ALERT_LOGINS` can route alerts to up to ten
  GitHub usernames.
- Focused Mercury fixtures bracket the July 23, 2026 direct station, asserting
  retrograde motion before it, direct motion after it, and the primary
  station timestamp within two minutes.

## Next implementation work

1. Evaluate a local JPL DE440/SPICE engine only if runtime redundancy becomes a
   product requirement.

The `nasa-jpl-freshness` check is now required by the protected `main` branch,
so production releases cannot merge behind a failed or stale independent
comparison.

## Phase 3: Last-known-verified current-sky cache

Status: implemented locally.

- Only snapshots containing non-empty, validated facts marked
  `verified-primary` or `verified-independent` can be persisted.
- Entries are isolated by date, coordinates, and timezone.
- Cached facts are explicitly rehydrated with local-cache provenance and cache
  age.
- Entries expire after 30 minutes and the cache is capped at 24 snapshots.
- Natal, synastry, composite, and other personal chart responses are excluded
  from this fallback.
- The reader sees a cache notice while a live refresh is in progress and a
  stronger notice if live calculation fails.
