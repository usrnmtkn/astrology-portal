# Codex: pattern-surface voice gate (new)

A voice gate for the natal aspect-pattern reader, modeled 1:1 on the sky-aspect
gate (lint-sky-voice + judge-sky-voice). The three structural gates
(validate_patterns / render_matrix / gold_render) already cover tokens, sign/house
variation, and grammar; this new gate covers whether the rendered copy sounds like
Marie and holds the two-level shape.

## New files (all in packages/astro-knowledge)
- `voice/tldr-astro/pattern-aspect.json` - the surface voice contract. Inversions vs
  the sky rubric: second person REQUIRED (we/us/our fails), degrees/orb ALLOWED in the
  mechanics level, shape checks for the two-level pattern (over-section + duplicate-beat).
- `voice/tldr-astro/pattern-examples.json` - canonical structured gold exemplars
  (tightened Yod / T-square / Grand Cross), used as the judge's like-register gold
  standard. Gold and production cards pass through the same labeled serializer.
- `scripts/lint-pattern-voice.js` - mechanical gate. `lintPatternCard(card)` accepts the
  resolver's `card.content` ({overview, sections}) or a plain string. Scores 1-3.
- `scripts/judge-pattern-voice.js` - LLM gate. Reuses `generate()` from
  generate-sky-aspect-cards.js (same provider/model/key), runs COLD (temp 0.1),
  tiers by apex/focal planet. `judgeCard(content, {apexPlanet, focalPlanet,
  patternType, samples})`. `serializePatternCard(content)` marks Level 1, Level 2,
  and the reading note explicitly before any model call. Exact canonical matches
  receive a deterministic 3, matching the rubric and preventing judge drift.
- `scripts/test-pattern-voice.mjs` - renders all 6 real fixtures through the production
  v3 resolver (unknown-time + a house-injected known-time variant), lints every card,
  and judges when a model key is present.

## package.json scripts added
- `lint:pattern-voice` -> `node scripts/lint-pattern-voice.js --examples`
- `test:pattern-voice`  -> `node scripts/test-pattern-voice.mjs`

## Current status (verified)
- `npm run lint:pattern-voice` -> all 3 gold exemplars score 3.
- `npm run test:pattern-voice` (no key) -> 12/12 cards lint 3, PATTERN VOICE GATE: PASS.
- Teeth check: the OLD 11-block Yod shape scores 1 with 4 fails (geometry-in-L1,
  over-sectioned, both duplicate-beat bans) - so a regression to the sprawl fails the gate.

## To run the LLM half + wire into CI
1. Set the generator's model key (same env as sky: `OPENAI_API_KEY` or
   `ANTHROPIC_API_KEY`, honoring `CONTENT_GENERATION_PROVIDER[_SKY_ASPECT]`).
   Then `npm run test:pattern-voice` also judges each card (samples=3, median);
   a median score of 1 fails the suite, a 2 is human-review with its reason printed,
   and a 3 is auto-publish.
2. Add `test:pattern-voice` to the aspect-pattern test group so it runs with
   test-aspect-pattern-*. It is deterministic without a key (mechanical only) and
   safe to run in CI; the LLM half only activates when a key is present.
3. Optional calibration (mirror test:judge-calibration): run judgeCard over the gold
   exemplars with samples=3 and assert each scores 3; if the model drifts, tune
   JUDGE_TEMPERATURE or add exemplars. Not required for the mechanical gate.

## Notes
- Idiomatic "things" ("throws itself into things") is intentionally NOT a mechanical
  fail (it flows in from approved placement source rows); it is left to the judge, same
  as the sky surface.
- The gate reads rendered cards; it does not change the resolver or the frozen
  template/contract. It is additive - no existing gate or wiring is modified.
