# Codex prompt: wire the judge gate + review queue

Implement the LLM-as-judge gate for sky-aspect cards. Full spec is in
`packages/astro-knowledge/CODEX-SKY-ASPECT-INTEGRATION.md` (Task C and the
"Persist the verdict" section). Do exactly the following; do not change the voice
files, exemplars, template, or linter.

## 1. Run the judge from the cron

The generator already integrates it. In `/api/cron/generate-sky-aspects`, call
`generateCard(args, { withJudge: true })`. On a linted-clean card it now returns:

```
result.judge = { score, verdict, weakest, why, gate }
result.gate  = "auto-publish" | "human-review" | "regenerate"
```

## 2. Persist the verdict

Add to each `generated_interpretations` row: `judge_score` (int 1-3),
`judge_verdict` (text), `judge_gate` (text), `judge_why` (text). Write a migration.

## 3. Route by gate

- `auto-publish` -> eligible for LIVE (must also be lint 3/0).
- `human-review` -> stays DRAFT, tagged for the review queue.
- `regenerate` -> re-queue for one more generation pass; cap at (say) 2 extra
  passes, then leave as `human-review`.

## 4. Dashboard queue

In `GeneratedContentAdminDashboard`, add a filter/tab **"Sky voice: needs review"**
showing only `judge_gate = 'human-review'`. Show the card body, the pair/aspect/
signs, and `judge_why`/`weakest` so a reviewer can act fast. Add a second small
view: a random sample of `auto-publish` rows for periodic audit.

## 5. Calibrate before trusting it

Run `npm run test:judge-calibration` (in `packages/astro-knowledge`, needs the
model key). It must show all 14 exemplars scoring 3 and the known-weak drafts
scoring 1-2. Do NOT let the judge auto-publish anything until this passes. If it
miscalibrates, report it - the judge prompt gets tightened, not the gate logic.

## Constraints

- No reader ever sees a card that is not both lint 3/0 and judge `auto-publish`.
- Do not hardcode the model or key; use the existing provider config.
- The judge reuses the generator's model settings; a dedicated lower temperature
  (~0.1) for judging is a nice-to-have, not required for v1.

## Report back

Migration added, cron change, dashboard filter, calibration result (exemplar and
weak-draft scores), and confirmation that typecheck + build pass.
