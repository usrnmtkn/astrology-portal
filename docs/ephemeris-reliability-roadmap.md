# Ephemeris Reliability Roadmap

## Phase 1: Actual-engine readiness and provenance

Status: released to production on 2026-07-31.

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

Status: released and verified on 2026-07-31.

- The `Ephemeris integrity` GitHub Actions workflow runs weekly and can also be
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

## Next implementation work

1. Configure repository-level Actions failure notifications for the team.
2. Persist report summaries outside short-lived workflow artifacts for a
   durable audit history.
3. Add focused station-boundary fixtures.
4. Evaluate a local JPL DE440/SPICE engine only if runtime redundancy becomes a
   product requirement.

## Phase 3: Last-known-verified current-sky cache

Status: released to production on 2026-07-31.

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
