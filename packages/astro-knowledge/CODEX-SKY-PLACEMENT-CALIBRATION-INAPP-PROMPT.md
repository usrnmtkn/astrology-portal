# Codex prompt: run placement calibration IN THE DEPLOYED APP (not local CLI)

Owner's decision: run the calibration the way it runs live in production, using the
real production judge — not a local checkout. This is the truest validation (same
model, temperature, and prompt path the auto-publish gate will actually use) and it
removes the local-CLI blockers entirely: the deployed app already holds the model
key and already makes these exact `gpt-4.1` calls, so there's no "send from a laptop
to a third party" step and no redacted key.

## What to do

Add a protected, one-off admin route in the deployed app (mirror the auth + shape of
the existing cron routes, e.g. `api/cron/generate-sky-placements.ts`) that runs the
placement calibration + sample IN PRODUCTION and returns JSON. It must:

1. Use `judgeConfig()` and assert the runtime target is `openai/gpt-4.1`,
   temperature `0.1` (the assertion you already added in
   `test-placement-calibration.js` line 22). Fail closed if it ever resolves to
   `gpt-4.1-mini` or anything else.
2. Run the calibration set: the 5 approved placement golds + the 4 weak controls,
   median-of-5, and report:
   - gold mean, weak mean, separation (must be >= 1.5),
   - golds rated off-voice (must be 0),
   - weak controls that passed as 3 (must be 0),
   - per-card scores.
3. Generate the 5 current-sky placement cards (evergreen bases only, no topper) and
   return them UNEDITED for an owner voice audit.
4. NOT set `SKY_PLACEMENT_JUDGE_CALIBRATED`, NOT deploy the placement cron, NOT
   schedule anything. This route only reports; enabling auto-publish is a separate
   step after the owner signs off on the sample.

## Guardrails
- Reuse the calibration + judge code already committed; the route is just a
  production entry point into it.
- Protect the route the same way the crons are protected; it can be removed or left
  disabled after the run.
- Report back: the calibration numbers, the 5 sample cards verbatim, and confirmation
  the judge ran on `openai/gpt-4.1`. If calibration fails the separation gate, STOP
  and report the per-card scores — do not loosen the gate.
