# Codex: wire and integrate the collective sky-aspect cards

You are integrating a finished voice system. Everything needed is in
`packages/astro-knowledge/`. Your two jobs:

1. **Wire `generate()` to the app's model** so the card matrix can be filled.
2. **Integrate the cards into the app's Sky surface** (the current-sky aspect cards).

Do not redesign anything. The voice, template, guardrails, and exemplars are locked.

## Absolute rules

- **Never invent astrology.** A card's meaning comes only from `data/pairs/{a-b}.json`
  (fields `blend`, `harmonious`, `hard`). If there is no pair file, do not generate a card.
- **Never bypass the linter.** Every card must pass `scripts/lint-sky-voice.js`
  (`lintCard(text)` returns `score === 3` and `fails === 0`) before it can ship.
  Route anything else to review.
- **Do not edit** `voice/tldr-astro/sky-aspect.json`, `examples.json`, or the exemplars
  without owner approval. They are the source of truth for voice.
- **Reader copy never exposes** provenance, editorial status, linter internals, dates,
  or aspect mechanics inside the poetic body.

## The system (what each file is)

- `voice/tldr-astro/sky-aspect.json` — the voice contract: the 8-beat template
  (`shape.beats`), `person` (first-person-plural "we"), `useWords` (phrase bank),
  `outputBans` (fail/warn), `conditionalBans` (steady), `metaphorGuidance`
  (elemental metaphors matched to planets/signs), `seriesContext`.
- `voice/tldr-astro/examples.json` — canonical exemplars: entries with
  `surface: "sky"`, `mode: "collective-aspect-card"`, `canonical: true`. 10 approved
  cards (current Sun + Moon pages). This is the few-shot teaching set.
- `voice/banned-words.json`, `voice/banned-constructions.json` — meaning-level bans,
  also enforced on card output by the linter.
- `data/pairs/{a-b}.json` — source-backed pair meaning. THE meaning layer.
- `scripts/generate-sky-aspect-cards.js` — the harness. `buildPrompt(args)` assembles
  the generation prompt from all of the above; `generateCard(args)` generates, lints,
  and retries; `generate(prompt)` is the SEAM you wire.
- `scripts/lint-sky-voice.js` — the gate. `lintCard(text)` ->
  `{ score, fails, warns, registerDraw, findings, notes }`.
- `docs/sky-aspect-generation.md` — pipeline overview.

Inspect the assembled prompt for any aspect with no model needed:

```
node scripts/generate-sky-aspect-cards.js --dry-run sun-pluto opposition leo aquarius
```

## Task A — wire `generate()`

In `scripts/generate-sky-aspect-cards.js`, replace the `generate(prompt)` stub with a
real call to the app's model, using the app's key (env, do not hardcode). It receives
the assembled prompt string and must return the card text only.

- Keep `generateCard()`'s retry loop intact — it feeds the linter's failures back into
  the prompt and asks for a fix, up to `maxRetries`.
- Suggested decoding: moderate temperature (around 0.7); the guardrails do the
  constraining, so the model has room to write.
- Accept a card only when `lintCard(text).score === 3 && fails === 0`. Everything else
  goes to a review queue, never straight to readers.

## Task B — run the matrix and render

Aspect facts come from the ephemeris (the immutable facts layer): `planetA`, `planetB`,
`aspect`, `signA`, `signB`, and `series { index, count, throughLabel }`. Do not infer
any of these from copy.

1. Normalize the pair to canonical order (match the `data/pairs` filename; reversed
   input normalizes without rewriting).
2. Map aspect -> meaning field: `conjunction` = `blend`; `sextile`/`trine` =
   `harmonious`; `square`/`opposition` = `hard`.
3. Call `generateCard({ a, b, aspect, signA, signB })`. Cards are sign-specific;
   cache by `pair + aspect + signA + signB` and regenerate when a planet changes sign,
   or generate at render.
4. Render three parts, kept separate:
   - the poetic card body (from generation);
   - the **series line**, only when `series.count >= 2`
     ("The {ordinal} of {count} passes, running through {throughLabel}."), from facts;
   - the **"what this looks like in space"** mechanics caption (degrees, the aspect,
     what each planet stands for), from facts — never inside the poetic body.

## Task C — the judge gate (this is what scales past human review)

The linter is the mechanical floor. It cannot catch overreach, moralizing,
stacked endings, or source drift. `scripts/judge-sky-voice.js` adds a second,
automated gate: a judge model scores each card 1-3 against the rubric.

Wire its `judge()` seam to the app model (reuse the generator's provider config).
Insert it right after the linter passes:

```
generate -> lint (3 / 0 fails) -> judge ->
    score 3  -> auto-publish (LIVE, no human)
    score 2  -> human-review queue (the only cards a person sees)
    score 1  -> regenerate, feeding the judge's "why" back (up to a retry cap),
                then queue if still failing
```

So a human only ever reviews the **borderline** cards, not the whole matrix.
Auto-published 3s should still be spot-audited on a small random sample to keep
the judge honest, and reader accurate/not-accurate feedback is the safety net.

Calibrate before trusting it: the 14 canonical exemplars must all judge as 3, and
a few known-weak drafts must judge as 1-2. If not, tighten the judge prompt.
`npm run test:judge-calibration` runs this check (needs the model key).

### Wiring the judge into the pipeline

The generator already integrates it. Call `generateCard(args, { withJudge: true })`
from the cron. On a card that passes the linter it now also returns:

```
result.judge = { score, verdict, weakest, why, gate }
result.gate  = "auto-publish" | "human-review" | "regenerate"
```

`withJudge` is opt-in, so nothing changes unless the cron sets it.

### Persist the verdict and give the dashboard a queue (Codex to build)

1. Store the judge result on each `generated_interpretations` row:
   `judge_score` (1-3), `judge_verdict`, `judge_gate`, and `judge_why`.
2. Route by `gate`:
   - `auto-publish` -> eligible for LIVE (still lint 3/0).
   - `human-review` -> stays DRAFT, tagged for the review queue.
   - `regenerate` -> re-queue for another generation pass (cap the loop).
3. In `GeneratedContentAdminDashboard`, add a filter/tab **"Sky voice: needs review"**
   that shows only `judge_gate = human-review`, plus a small random sample of
   `auto-publish` rows for periodic audit. That queue - not the whole matrix - is
   what a human reviews.

## Gaps — do not paper over

- Chiron, Lilith, and the Nodes have **no** `data/pairs` entries (only a `sun-chiron`
  STUB, marked `status: DRAFT`). Do NOT generate cards for any pair without a
  source-backed `data/pairs` file. Surface the gap; the owner authors the meaning first.
- The `sun-chiron` stub needs owner review before its cards ship.

## Acceptance

- `npm run validate` passes.
- `npm run lint:sky-voice` passes (all exemplars score 3).
- Every card shown to a reader scored `3 / 0 fails` from `lintCard`.
- No card ships for a pair missing its `data/pairs` source.
- Reader body contains no dates, degrees, or aspect mechanics; those live in the caption.
- Reader body is first-person-plural ("we"); no "you".

## Report back

Files changed, how `generate()` is wired, model + settings used, how many pairs x
aspects generated and passed on first vs retried, any pairs skipped for missing source,
and ten freshly generated cards copied straight from output (no hand-editing).
