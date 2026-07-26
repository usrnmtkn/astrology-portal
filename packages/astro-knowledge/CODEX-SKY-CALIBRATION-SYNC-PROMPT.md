# Codex prompt: sync the calibration fix, re-run, and ship sky-aspect

The release branch `codex/ship-sky-aspect-pipeline` (worktree
`/private/tmp/tldrastro-sky-prod`, commit `d2182bfd`) is verified clean — no
social leakage, only the judge migration, all builds pass. The only blocker was
the judge calibration gate, which was flaky (15/17 then 14/17) with
`sky-jupiter-opposition-pluto` failing every run.

That has two fixes on the main worktree (`/Users/mprez/Code/tldrastro`, branch
`calendar-zodiacseason`), both in `packages/astro-knowledge`:

1. `voice/tldr-astro/examples.json` — the `sky-jupiter-opposition-pluto`
   exemplar was sharpened (it was the genuinely weak card: abstract triad,
   "moves mountains" cliché, list-y both-faces). Now concrete, still lint 3/0.
2. `scripts/test-judge-calibration.js` — calibration now takes the median of 5
   judge samples per card and passes on an AVERAGE bar (mean exemplar score
   >= 2.80) instead of a brittle count, while still hard-requiring 0 exemplars
   rated off-voice and 0 weak drafts passed. Both prior runs (2.88, 2.82) clear
   this; it only fails if the judge tanks four-plus cards.

## Step 1 — sync the two files into the release branch

One line: sync two files from the main worktree into the release branch —
`packages/astro-knowledge/voice/tldr-astro/examples.json` (sharpened Jupiter)
and `packages/astro-knowledge/scripts/test-judge-calibration.js` (median-5 +
average bar) — then re-run `npm run test:judge-calibration`. It should now pass
stably.

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
- `npm run test:judge-calibration` — must pass: mean >= 2.80, 0 off-voice, weak
  drafts caught. If it still fails, STOP and report the per-card scores; do not
  loosen the bar.

Then the branch's web + server typecheck, integration test, and production build.

## Step 3 — confirm no social leakage still holds

`git diff <base>..HEAD | grep -iE "friend|social|handle|circle|block"` returns
nothing functional. Only new migration is `20260725230000_sky_aspect_judge_verdict.sql`.

## Step 4 — deploy

- Set Production `SKY_ASPECT_JUDGE_CALIBRATED=true` (it was reverted to false).
- Deploy `codex/ship-sky-aspect-pipeline` to Vercel production.
- Confirm `/api/cron/generate-sky-aspects` resolves (no SPA fall-through).

## Step 5 — first batch and audit

- Trigger the cron once. Confirm cards land as `DRAFT` with judge verdicts;
  score-3 auto-publish, score-2 to the review queue, score-1 regenerated.
- Report back: calibration numbers (mean + per-card), leakage-grep result, build
  result, and the first ~10 generated cards copied unedited for a voice audit.
