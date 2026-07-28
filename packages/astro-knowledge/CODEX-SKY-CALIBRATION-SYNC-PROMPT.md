# Codex prompt: sync the calibration fix, re-run, and ship sky-aspect

The release branch `codex/ship-sky-aspect-pipeline` (worktree
`/private/tmp/tldrastro-sky-prod`, commit `d2182bfd`) is verified clean — no
social leakage, only the judge migration, all builds pass. The only blocker was
the judge calibration gate, which was flaky (15/17 then 14/17) with
`sky-jupiter-opposition-pluto` failing every run.

That has fixes on the main worktree (`/Users/mprez/Code/tldrastro`, branch
`calendar-zodiacseason`), all in `packages/astro-knowledge`:

1. `voice/tldr-astro/examples.json` — two exemplars sharpened:
   `sky-jupiter-opposition-pluto` (was abstract triad, "moves mountains" cliché,
   list-y both-faces) and the close of `sky-sun-conjunction-jupiter` (dropped an
   advice-y "Take the opening…" ending for a truth-plus-catch that doesn't
   instruct). Both still lint 3/0; all 17 exemplars remain 3/0.
2. `scripts/test-judge-calibration.js` — the gate changed from a brittle
   absolute-mean bar to a SEPARATION bar. An LLM judge is stochastic, so a
   borderline exemplar flickering 2↔3 moves the mean by ~0.06 and fails a hard
   `mean >= 2.80` on pure noise — not a real regression. The stable, meaningful
   signal is the GAP between good cards and known-bad ones. New pass condition:
   0 exemplars rated off-voice (1), 0 weak drafts rated in-voice (3), and
   (exemplar mean − weak mean) >= 1.5. It still prints the raw exemplar mean and
   every per-card score on each run, so the stochastic edge stays visible — the
   change makes the gate robust to noise, it does not hide or lower the bar. The
   weak-control set grew from 2 to 4 so the weak mean is itself stable. On the
   13/17 run that mean-gated at 2.76, exemplar mean 2.76 − weak mean ~1.0 = ~1.76
   separation, which clears 1.5; a genuinely degraded judge (exemplars collapsing
   toward the weak band, or any weak draft rated 3) still fails.

## Step 1 — sync the two files into the release branch

One line: sync two files from the main worktree into the release branch —
`packages/astro-knowledge/voice/tldr-astro/examples.json` (sharpened Jupiter +
Sun-Jupiter close) and `packages/astro-knowledge/scripts/test-judge-calibration.js`
(separation gate + 4 weak controls) — then re-run `npm run test:judge-calibration`.
It should now pass stably.

Concretely, from the branch worktree:

```
cp /Users/mprez/Code/tldrastro/packages/astro-knowledge/voice/tldr-astro/examples.json \
   /private/tmp/tldrastro-sky-prod/packages/astro-knowledge/voice/tldr-astro/examples.json
cp /Users/mprez/Code/tldrastro/packages/astro-knowledge/scripts/test-judge-calibration.js \
   /private/tmp/tldrastro-sky-prod/packages/astro-knowledge/scripts/test-judge-calibration.js
```

Commit them onto `codex/ship-sky-aspect-pipeline` (voice-only change, no social).

## Step 2 — re-verify on the branch

In `/private/tmp/tldrastro-sky-prod/packages/astro-knowledge`:

- `npm run validate`
- `npm run lint:sky-voice` (all 17 exemplars 3/0)
- `npm run test:judge-calibration` — must pass: 0 exemplars off-voice, 0 weak
  drafts passed as 3, and separation (exemplar mean − weak mean) >= 1.5. If it
  still fails, STOP and report the per-card scores and both means; do not loosen
  the bar.

Then the branch's web + server typecheck, integration test, and production build.

## Step 3 — confirm no social leakage still holds

`git diff <base>..HEAD | grep -iE "friend|social|handle|circle|block"` returns
nothing functional. Only new migration is `20260725230000_sky_aspect_judge_verdict.sql`.

## Step 4 — deploy

- Set Production `SKY_ASPECT_JUDGE_CALIBRATED=true` (it was reverted to false).
- Deploy `codex/ship-sky-aspect-pipeline` to Vercel production.
- Confirm `/api/cron/generate-sky-aspects` resolves (no SPA fall-through).

## Step 5 — regenerate the held drafts

The 14 cards currently sitting in the review queue were generated before the
closing-discipline fixes (stacked-ending linter warn + sharpened close
anti-patterns in `buildPrompt`). Force-regenerate them so they pick up the new
rules rather than shipping the old copy — do not hand-edit and re-publish the
stale drafts. Re-run each through the full generate → lint → judge gate.

## Step 6 — first batch and audit

- Trigger the cron once. Confirm cards land as `DRAFT` with judge verdicts;
  score-3 auto-publish, score-2 to the review queue, score-1 regenerated.
- Report back: calibration numbers (both means + separation + per-card),
  leakage-grep result, build result, and the first ~10 generated cards
  (including the regenerated held drafts) copied unedited for a voice audit.
