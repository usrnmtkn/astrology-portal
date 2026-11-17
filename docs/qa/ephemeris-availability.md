# Ephemeris availability and incident contract

This implementation is repository code until it is released. Local tests do
not establish that a deployed revision has these protections.

## Runtime observations

`GET /api/health?scope=ephemeris` returns `ephemeris-health/v1`, a timestamp,
the deployment commit when available, and two dependency observations:

- `ephemeris` calculates the current instant using the web application's Swiss
  engine. It checks verified fact provenance, the requested coordinates/time,
  the True Node contract, and the complete position count.
- `skyCalculationApi` requests `/ready`, requiring fresh successful Sun, Moon,
  and True Black Moon Lilith probes with Swiss flags and no Moshier fallback.

HTTP 200 requires both checks to pass; failure or unknown readiness returns
503 with a bounded reason code. This scope performs no database, writer,
publication, billing, or personal-profile work. Concurrent probes share one
result per function instance for at most 15 seconds, retaining its original
observation time. Consumers reject observations older than two minutes.

The full `/api/health` route keeps its existing deployment-health policy;
agents must use the scoped readiness contract rather than its aggregate flag.

## App behavior

The app checks readiness after its initial reading, every minute while visible,
and when it returns online or becomes visible. API failures are recorded while
a verified local fallback is attempted. Failed readiness, a failed worker, or
stale retained data triggers the warning; healthy fallback loading does not.
Browser observations contain only the
source and health state; personal inputs are not uploaded to the monitor.

Existing exact-input validation, verified-cache expiry and provenance, and
local Swiss fallback remain required. A warning does not invalidate an
independently successful calculation from a healthy path. An affected reading
uses its existing error/retry state, or explicitly labeled verified cache;
unverified results are rejected. Retained in-memory results also carry their
calculation time after a failed refresh, and live results older than the
existing 30-minute limit are removed rather than retained as current. A successful service recovery retries a
failed/stale Sky selection. “Check again” probes readiness and retries Sky.

A foreground Sky/preload worker has a 30-second deadline. A hung or unreadable
worker is terminated and its pending requests reject; the next attempt gets
a fresh worker. Longer detail searches retain their existing two-minute limit.
Server/client deadlines bound waiting, but cannot preempt synchronous work
inside a server process. Browser fallback and the worker boundary remain
necessary even when a server probe cannot complete.

## Agent incidents

The existing `Calculation service availability` workflow probes this contract
every 15 minutes, subject to GitHub scheduling delays. It uses bounded retries
before declaring an incident, preserves JSON observations as run artifacts,
and assigns/mentions the existing configured alert recipients. It creates or
reopens one incident on an outage, closes it on recovery, and avoids issue
writes during unchanged states. Feature-branch dispatches cannot publish an
incident. No Codex automation or external notification service is added.

For an incident, inspect the latest run and its JSON observation, identify the
failed dependency/code, and reproduce the failing path with synthetic inputs.
Retain unknown and failed evidence. Recovery requires a fresh successful
observation; an old successful run cannot override a newer failure. An alert
does not authorize paid calls, releases, or weakening exact-head CI gates.

## Accuracy boundary

Readiness detects unavailable engines, fallback, malformed/unverified facts,
stale observations, and hangs. It cannot prove every plausible longitude or
aspect is mathematically correct. The separate weekly/manual NASA/JPL shadow
comparison verifies supported facts and reports unsupported coverage explicitly.
Its discrepancy or stale-verification findings require review before release;
they must not be relabeled as a runtime outage or silently waived. Neither
monitor promises uninterrupted service or perfect correctness.

## Verification

`npm run test:ephemeris-health` covers real Swiss calculations on multiple
dates, the scoped HTTP handler, wrong inputs, engine fallback, staleness,
timeouts, worker restart, and notification transitions with intercepted writes.
`tests/visual/ephemeris-health.spec.ts` exercises the actual app and Sky handler
with synthetic upstream readiness, including reload and recovery in both
themes at mobile and desktop widths. It is part of reader-surface CI.
