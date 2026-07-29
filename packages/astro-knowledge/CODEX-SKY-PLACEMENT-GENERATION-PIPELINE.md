# Sky placement articles: engine + judge (built 2026-07-27, new files only)

The placement grid is 168 cells (14 planets x 12 signs). Seven calibration
trios are authored and approved; the rest render generic fallback. This
pipeline authors the remaining cells the same way the sky-aspect cards scale:
generate -> lint -> judge -> gate, with the seven owner trios as ground truth.

## Article structure (owner's CHANI models, 2026-07-27)

The owner supplied two CHANI pages as STRUCTURAL models (Sun-in-Leo horoscopes,
Jupiter-in-Leo guide) - structure borrowed, copy never. The page renders:

1. TAGLINE - 2-5 word imperative under the title (generated slot, new)
2. WHEN - date range, COMPUTED from ephemeris, never generated
3. HOOK - doubles as CHANI's "Takeaway" block (approved beat)
4. LIVED - body with pace (approved beat)
5. TURN - the confrontation (approved beat)
6. MOVES - 2-3 concrete ways to work with the transit (generated slot, new;
   CHANI's "7 ways" cut to the best 2-3, each held to the swap test)
7. Dated sky events during the transit (lunations/eclipses/aspects) in their
   own blocks below, COMPUTED only

CHANI's "last time this happened" history section is deliberately EXCLUDED:
it needs sourced historical claims we do not have (falsifiability rule).
The engine emits {tagline, hook, lived, turn, moves}; rows materialize as
`sky-placement-tagline|hook|lived|turn|moves/{planet}/{sign}`. The 7 approved
trios predate tagline/moves, so those two slots lint only when present and
their shape is taught from marked shape-illustrations in the spec (NOT
owner-approved copy). Generating tagline+moves for the 7 calibration pairs is
allowed - they land as needs_review drafts and never touch the approved trio
rows.

Built while other work had uncommitted edits, so it is ALL NEW FILES - nothing
you have open was touched, and nothing is committed. Wiring steps below are
yours to land.

## Files (all in packages/astro-knowledge)

- `voice/tldr-astro/sky-placement.json` - the voice contract: three-beat shape
  (hook / lived / turn) from `apps/web/src/content/sky-writing/TLDR-Sky-Article-Spec.md`,
  pace labels per planet, tier register (luminary / personal / social /
  generational), output bans, and the 7 approved trios embedded as canonical
  exemplars. Unlike sky-aspect: SECOND PERSON IS ALLOWED (mixed we/you).
- `scripts/lint-placement-voice.js` - mechanical gate. All 7 exemplars lint 3
  with 0 findings (verified). Fails: banned words, lore tells, retired frames
  ("for everyone at once", "wishing you"), blessing closers, dates/degrees,
  missing slots. Warns: stacked endings, not-X-but-Y, "reveals", etc. Sentence
  ranges and the pace check are advisory notes only.
- `scripts/generate-sky-placement-articles.js` - the engine. Source meaning
  comes from `data/placements/sign/{planet}-{sign}.json` (10 classical
  planets), falling back to the V3 raw rows
  (`fallback-source/placement/{planet}/{sign}/raw`) for Chiron and the Nodes.
  Reuses `generate()` from generate-sky-aspect-cards.js (same provider/env).
  Output is strict JSON {hook, lived, turn}; em dashes normalize
  deterministically; lint failures feed back into up to 3 retries; clean
  results materialize the three `fallback-hook/sky-placement-{slot}/{planet}/{sign}`
  rows with `review_status: "needs_review"` (never self-approving).
- `scripts/judge-placement-voice.js` - LLM-as-judge, cold (0.1), median-of-N
  sampling, tier-matched gold standard from the embedded exemplars. Adds the
  SWAP TEST (if another planet-sign could wear the body, score 1). Gates:
  3 auto-publish, 2 human-review, 1 regenerate.
- `scripts/test-placement-pipeline.js` - OFFLINE contract test (injected
  model, no key). PASSES: exemplars 3/0, row materialization, retry feedback,
  em-dash normalization, source-gap skips, grid accounting (7 authored, 149
  ready, 12 missing = all lilith), prompts build for every tier.
- `scripts/test-placement-judge-calibration.js` - NEEDS KEY. Same trust bar
  the aspect judge converged on: 0 exemplars off-voice, 0 weak drafts rated 3,
  exemplar-vs-weak separation >= 1.5 (median of 5 samples). Weak controls
  cover this surface's real failure modes: kumbaya assembly, swap-anywhere
  generic, announcement hook + stacked endings, moralizing coach.

## Wiring for you to land (I did not touch these files - you have them open)

1. `packages/astro-knowledge/package.json` scripts:
   - `"lint:placement-voice": "node scripts/lint-placement-voice.js --exemplars"`
   - `"test:placement-pipeline": "node scripts/test-placement-pipeline.js"`
   - `"test:placement-judge-calibration": "node scripts/test-placement-judge-calibration.js"`
2. Optional per-surface provider override, mirroring sky-aspect:
   `CONTENT_GENERATION_PROVIDER_SKY_PLACEMENT` (the engine currently inherits
   the aspect surface's config via the shared `generate()`; add the override in
   `generationConfig()` if you want a different model here - the aspect surface
   settled on full gpt-4.1, expect the same need).
3. Gate flag: only allow auto-publish after
   `npm run test:placement-judge-calibration` passes, behind
   `SKY_PLACEMENT_JUDGE_CALIBRATED=true` (same pattern as
   SKY_ASPECT_JUDGE_CALIBRATED).
4. Renderer: `renderSkyPlacement()` currently reads hook/lived/turn only. Wire
   the two new slots: `sky-placement-tagline/{planet}/{sign}` renders under the
   title (fragment, no period), `sky-placement-moves/{planet}/{sign}` renders
   after the turn as a short list (body is one move per line). Both optional -
   absent slots render nothing. The computed date range ("When") and dated
   event blocks stay renderer-owned.

## Running the batch (must run on the host - the agent sandbox has no API egress)

Keys are already in apps/web/.env.local (the engine loads it). Order:

```
cd packages/astro-knowledge
node scripts/test-placement-pipeline.js                  # offline, should pass
node scripts/test-placement-judge-calibration.js         # ~55 judge calls; must pass FIRST
node scripts/generate-sky-placement-articles.js --batch 24 moon,sun    # pilot: luminary rows
node scripts/generate-sky-placement-articles.js --batch                # everything else
```

`--batch [limit] [planet,planet,...]` is RESUMABLE: drafts land in
`packages/astro-knowledge/out/sky-placement-drafts/` (one JSON per cell +
`_summary.json`), existing drafts are skipped on re-run, and the 7 approved
trios are never regenerated (grid report lists them as authored). Each draft
carries `rows` (the five `sky-placement-tagline|hook|lived|turn|moves` hook
rows, all `needs_review`), `lint`, `judge`, and `gate`.

AFTER every batch, run the cross-draft sameness audit - the linter and judge
score one card at a time and CANNOT see batch-level repetition (the first
pilot judged 16/16 auto-publish while putting "coffee order" in 18 drafts and
opening 15 hooks with "You catch yourself"):

```
node scripts/audit-placement-batch.js     # exit 1 = flagged drafts + rm command
```

Delete the flagged files and re-run --batch (resumable) until the audit is
clean. Pace phrases ("two and a half days", "about four weeks") are
allowlisted; everything else shared across >=15% of drafts gets flagged. The
2026-07-27 leak fix also added the crutches to outputBans (coffee order,
unsent, overfilled calendar, group chat, "you catch/find yourself") and a
SAMENESS anti-pattern block to the generation prompt.

Suggested order: Moon and Sun rows first (Moon surfaces every 2.5 days), then
Mercury/Venus/Mars, then social + generational. Audit the first 10-15 drafts
by hand before trusting the gate split. Merge reviewed rows into `hookRows`
in fallback-source-rows-v3.json, bump PACKAGE_VERSION + dist in the same
commit, and run `npm run test:content && npm run typecheck` before committing
(repo rule). Add `out/` to .gitignore if it is not already covered.

## Pending row edit (owner-approved 2026-07-27, needs your sync)

The Sun-in-Leo hook was updated. New approved copy (already live in the spec's
exemplars, which the judge uses as gold standard):

> Nobody claps for the thing you never show them. The Sun's move into Leo
> turns the lights on: a month of wanting to be seen doing it, not just
> having done it.

Update `fallback-hook/sky-placement-hook/sun/leo` (body_you + body_they) in
fallback-source-rows-v3.json to match - that file is in your uncommitted work,
so the edit is yours to land (one-writer rule). Two approved alternates are
stored as `hookVariants` on the exemplar. The old "running on autopilot" hook
is retired.

## Known gaps

- Lilith: LIVE 2026-07-28. `data/placements/sign/lilith-{sign}.json` x12
  authored, owner-reviewed, and promoted into the reader-eligible V3 rows,
  distilled from the owner's
  Black Moon Lilith compilation (Resources/937057437-Lillith-Black-Moon.docx,
  'Black Moon Lilith in the Signs' chapter). Lilith reads as a wound-point
  (shame/rejection through the sign's style), similar register to Chiron.
  schema validation passes; grid shows 0 missing sources. NOTE: the
  Goldstein-Jacobson 'Dark Moon Lilith' book in Resources is the OTHER Lilith
  (hypothetical Waldemath moon) - do not source Black Moon copy from it.
- The social tier (Jupiter/Saturn/Nodes/Lilith) still uses generational gold
  in the judge. The first few approved social-tier articles should be added to
  `voice/tldr-astro/sky-placement.json` exemplars with `"tier": "social"` -
  that is the compounding loop.
- The optional current-aspect line stays COMPUTED at runtime (exact dates from
  ephemeris) per the spec; the engine never generates it.
