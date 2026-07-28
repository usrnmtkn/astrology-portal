# Codex prompt: enable sky placements (owner approved)

Owner approved enabling placements. Do it in this order - the guardrail is that
nothing enables auto-publish until the steady-family bug is fixed, or the gate will
publish steady-family leaks (Moon's false-3 is exactly that case).

## Prerequisites (must be true before flipping the flag)

1. The steady-family lint fix (`CODEX-SKY-STEADY-FAMILY-LINT-FIX.md`) is applied and
   verified: 22 golds still lint 3/0, "steadiness/steadies/steadier" now caught,
   Moon polished to "consistency".
2. All placement refinements from `codex/placement-calibration-oneoff` (label fix,
   concrete-middle prompt, steady-family fix, retry-feeds-substitute) are ported
   into the RELEASE branch `codex/ship-sky-aspect-pipeline`, where the placement
   app/cron/engine already live. Re-run on the release branch: astro validation,
   22 gold lints, placement-engine contract, aspect regression, web/API typecheck,
   production build.
3. One more in-app calibration run on the release branch confirms PASS on
   `openai/gpt-4.1` temp 0.1 (0 golds off-voice, 0 weak passed, separation >= 1.5).

## Enable

4. Set `SKY_PLACEMENT_JUDGE_CALIBRATED=true` in production.
5. Schedule the placement cron (`generate-sky-placements`): daily and idempotent -
   it generates any current-sky placement base not already cached and no-ops on the
   rest, so the 168 bases fill in over time and stay cached (bases are evergreen;
   toppers are the separate phase 2, not part of this enable). Route stays
   authenticated (no SPA fall-through).
6. Confirm the auto-publish routing end to end: judge 3 -> LIVE, judge 2 -> human
   review, lint/judge 1 -> regenerate. Confirm the human-review queue for
   placements is reachable in the admin dashboard so the one-line polish on the 2s
   can actually happen.
7. Deploy to production (promote to the public domain).

## Report back

- Flag state, cron schedule, and the first cron run: how many current-sky
  placements auto-published (3) vs went to review (2) vs regenerated.
- Confirm the Sky page renders generated placement bases (with the old slot-fill
  template only as fallback for any not-yet-generated placement).
- The live URL, and the leakage/scope checks (no social, only the placement
  migration).

## Not in scope
- Toppers (phase 2 - live-sky coupling).
- Sun/Mercury ceiling 2s: they route to human review by design; do not tune further.
- The 37 daily-body / transit rewrites: separate authorized apply step, not part of
  this placement enable.
