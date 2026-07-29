# Codex prompt: sky write-ups launch (today)

Two threads. Thread A ships today; Thread B is a fast follow.

## Thread A - apply the 37 daily-body rewrites (ship today)

The Do/Don't daily-body copy has 37 owner-approved rewrites (stacked-ending +
promise + weld fixes), all lint-clean. Apply them into
`apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json`
on the release branch `codex/ship-sky-aspect-pipeline`.

- Use the verified apply script `apply-dodont-rewrites.mjs` (attached) with the
  rewrite set `dodont-rewrites-FINAL.json` (attached). It sets body_you AND
  body_they (identical for daily-body) for each `fallback-hook/daily-body/<key>`
  row, refuses to write on any missing key or unexpected lint issue, and is
  idempotent. Dry run reports: 37 applied, 0 missing, 0 lint issues.
- Run `node apply-dodont-rewrites.mjs --write`, then validate (content validation +
  the fallback-architecture test) and deploy.
- These are the 37 stacked/weak rows only; the other 31 daily-body rows are
  unchanged. No schema, no cron, no social.

NOTE: the solo-transit lived-first restructure (the "Chiron square your Jupiter"
gold) is a SEPARATE, larger build (restructure the transit.aspect template + its
assembly) - NOT part of today's apply. Today is the daily-body copy only.

## Thread B - placement toppers (fast follow)

Build per `CODEX-SKY-PLACEMENT-TOPPERS-PHASE2.md`: the live-aspect layer prepended
to the evergreen bases, gated behind its own flag + calibration. Real build, not a
same-day flip - land it right after Thread A.

## Report
- Thread A: the deploy result, that the You page renders the new daily-body copy,
  and a couple of the live cards verbatim.
- Thread B: progress against the topper spec.
