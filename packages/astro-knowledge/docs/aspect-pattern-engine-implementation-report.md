# Aspect Pattern Engine Implementation Report

## Files Changed

- `packages/astro-knowledge/docs/aspect-pattern-engine-spec.md`
- `packages/astro-knowledge/docs/aspect-pattern-engine-implementation-report.md`
- `packages/astro-knowledge/engine/aspect-patterns/index.js`
- `packages/astro-knowledge/engine/aspect-patterns/index.d.ts`
- `packages/astro-knowledge/engine/aspect-patterns/fixtures.js`
- `packages/astro-knowledge/scripts/test-aspect-pattern-engine.js`
- `packages/astro-knowledge/scripts/print-aspect-pattern-fixtures.js`
- `packages/astro-knowledge/package.json`
- `api/_lib/aspect-patterns.ts`
- `api/astrology-facts.ts`
- `apps/web/src/services/ephemeris.ts`
- `apps/web/src/types.ts`
- `apps/web/src/astro-knowledge.d.ts`
- `scripts/test-astrology-facts-aspect-patterns.mjs`
- `package.json`

## Tests Run

```text
npm run test:aspect-patterns -w @tldr/astro-knowledge
npm run fixtures:aspect-patterns -w @tldr/astro-knowledge
npm run test:aspect-patterns-api
npm run typecheck -w @tldr/web
npm run test:timing -w @tldr/astro-knowledge
```

## Fixture Results

- `grand_square`: emits one Grand Square and four unique component T-squares. Each component T-square has a `contains` relationship from the Grand Square.
- `t_square`: emits one T-square with opposition axis, apex, source aspect IDs, and empty leg opposite the apex.
- `grand_trine`: emits one Grand Trine with element consistency.
- `kite`: emits one Kite and its underlying Grand Trine. The Kite records focal planet, opposed trine planet, spine, and resource planets.
- `yod`: emits one Yod with sextile base, apex, and fallout point opposite the apex.
- `mystic_rectangle`: emits one Mystic Rectangle with two opposition axes, supportive aspects, and no apex/focal planet.
- `angle_node_ignored`: emits no patterns; angle/node aspects are skipped as non-planet pattern members.
- `wide_grand_trine`: retains the valid wide pattern with `wide` confidence and a warning.
- `partial_t_square`: retains the partial pattern with `partial` confidence and a warning.
- `invalid_near_pattern`: emits no complete pattern.
- `out_of_sign_grand_trine`: retains the pattern with out-of-sign metadata and warning.

## Base Ranking

The aspect-pattern engine now exports a separate math-only ranking layer:

```text
rankAspectPatterns(detectionResult, context, policy)
```

Ranking does not mutate or reorder the canonical `patterns` array. It returns:

- `policyId`
- one ranking record per detected pattern
- `displayOrder`
- separate `geometry`, `natalProminence`, `structuralContext`, and `baseDisplayPriority` scores
- machine-readable reason codes for all score contributions

The default policy is `natal_pattern_ranking_v1`.

Ranking uses only permanent natal facts: geometry confidence, orb tightness, luminary involvement, personal planets, chart ruler when available, angular proximity when angles are available, repeated planets, and parent/contained pattern relationships. It does not use transits, progressions, current activation, copy, phrasebanks, UI, or admin state.

Charts without birth time remain valid and deterministic. Missing angles and missing Ascendant ruler simply contribute zero prominence.

## API Exposure

The `/api/astrology-facts` endpoint can include read-only aspect-pattern diagnostics when called with:

```text
includeAspectPatterns=true
```

The response adds:

- `sky.aspectPatterns`
- top-level `aspectPatterns`

`sky.aspectPatterns` is the canonical API location because these are calculated sky facts. The top-level `aspectPatterns` field is a temporary convenience alias that references the same calculated result. The opt-in aspect-pattern payload now includes `ranking`.

Existing responses stay unchanged when the query flag is absent. The API helper consumes already-calculated snapshot positions/aspects and does not calculate planetary positions, rewrite facts, generate copy, rank display, or connect to UI/admin surfaces.

## Quincunx Coverage

The normalized aspect calculator now emits `quincunx` aspects at 150 degrees with a 3-degree orb cap. Existing major aspects keep their 5-degree cap. Aspect records preserve the existing `from`/`to` shape and also include stable `id`, `bodyA`, and `bodyB` fields.

The API contract test verifies a real calculated snapshot for `2026-01-01T12:00:00.000Z` emits quincunxes, including a raw longitude pair greater than 180 degrees that normalizes into a 150-degree angular separation.

## Known Limitations

- The engine consumes already-calculated normalized aspects. It does not calculate planetary positions or infer missing aspects from longitude.
- House assignment for derived points is intentionally not calculated yet. Derived points include longitude and sign.
- Partial pattern support is limited to supplied aspects that fall within the orb policy tolerance or are explicitly marked partial. Missing-aspect near-patterns are rejected.
- Mystic Rectangle support is limited to the classical trine/sextile variant in this pass.
- Geometry confidence uses deterministic thresholding against the configured orb policy. These thresholds can be tuned after fixture review.
- The current app aspect calculator emits major aspects plus the 150-degree quincunx required for Yod detection. It still intentionally excludes other minor aspects.
- The API helper test passes but Vite may print a sandbox-only HMR websocket bind warning.

## Intentionally Deferred

- Facts API integration
- Chart readers
- Content generation
- Phrasebank integration
- Admin dashboard display or editing
- Transit/progression activation
- Natal prominence scoring
- Display ranking
- Planetary chart-shape detection
- Interpretation copy
