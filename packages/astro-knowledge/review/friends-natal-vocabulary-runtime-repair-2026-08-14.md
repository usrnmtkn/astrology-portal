# Friends natal vocabulary runtime repair — 2026-08-14

## Scope

This is a resolver, bundle-loading, and empty-detail UX repair. It changes no reader copy, approval state, serving lane, auto-publish state, or writer-promotion state.

## Reproduction and root cause

The canonical fallback source contains exactly 720 vocabulary rows. All 720 carry `body`; none carry `body_you` or `body_they`.

The source resolvers already returned `row.body` for vocabulary. The production browser artifact nevertheless returned `SOURCE_GAP` for an ordinary Friend natal placement because the Friends Natal tab did not request the deferred fallback bundle. The eager bundle intentionally contains the 720 shared vocabulary rows but omits natal hooks such as `fallback-hook/planet-intro/*`, `fallback-hook/planet-best/*`, `fallback-hook/placement-sentence/*`, `fallback-hook/house-meaning/*`, and `fallback-hook/placement-house-sentence/*`. Before the deferred bundle loaded, the required hook slot `planetBest` was null and the article collapsed to its heading.

The repair makes the Friends Natal request load the deferred natal rows, rebuilds the browser resolver artifact, and makes the existing `body` fallback explicit and voice-aware:

- You: `body_you ?? body`
- Friend: `body_they ?? body`
- the governed 40-row second-person inventory remains `SOURCE_GAP` in Friend voice

Across the complete 14-planet × 12-sign × 12-house placement matrix, the deferred-load repair restores 1,728 of 2,016 Friend placement passages. The 288 remaining combinations are the Sun and Jupiter placements that depend on a governed second-person vocabulary slot and therefore remain intentionally unavailable pending owner-reviewed Friend wording.

## Governed 40-row Friend fail-closed inventory

1. `fallback-vocab/house-jurisdiction/1`
2. `fallback-vocab/house-jurisdiction/3`
3. `fallback-vocab/house-jurisdiction/7`
4. `fallback-vocab/house-jurisdiction/11`
5. `fallback-vocab/house-jurisdiction/12`
6. `fallback-vocab/planet-excess/sun`
7. `fallback-vocab/planet-productive/sun`
8. `fallback-vocab/planet-function/sun`
9. `fallback-vocab/planet-function/moon`
10. `fallback-vocab/planet-function/mercury`
11. `fallback-vocab/planet-function/venus`
12. `fallback-vocab/planet-excess/jupiter`
13. `fallback-vocab/planet-function/chiron`
14. `fallback-vocab/planet-productive/north-node`
15. `fallback-vocab/planet-productive/south-node`
16. `fallback-vocab/house-pressure/1`
17. `fallback-vocab/placement-gerund/chiron/aries/0`
18. `fallback-vocab/placement-gerund/chiron/gemini/0`
19. `fallback-vocab/placement-gerund/chiron/leo/0`
20. `fallback-vocab/placement-gerund/chiron/virgo/0`
21. `fallback-vocab/placement-gerund/chiron/libra/0`
22. `fallback-vocab/placement-gerund/chiron/scorpio/0`
23. `fallback-vocab/placement-gerund/chiron/sagittarius/0`
24. `fallback-vocab/placement-gerund/chiron/capricorn/0`
25. `fallback-vocab/placement-gerund/chiron/aquarius/0`
26. `fallback-vocab/placement-gerund/chiron/pisces/0`
27. `fallback-vocab/dodont-do/mercury/libra`
28. `fallback-vocab/dodont-do/mercury/aquarius`
29. `fallback-vocab/dodont-reward/moon`
30. `fallback-vocab/dodont-moon-dont/taurus`
31. `fallback-vocab/dodont-moon-do/gemini`
32. `fallback-vocab/dodont-moon-do/cancer`
33. `fallback-vocab/dodont-moon-dont/libra`
34. `fallback-vocab/sky-planet-function/chiron`
35. `fallback-vocab/sky-planet-function/jupiter`
36. `fallback-vocab/sky-planet-function/mercury`
37. `fallback-vocab/sky-planet-function/moon`
38. `fallback-vocab/sky-planet-function/north-node`
39. `fallback-vocab/sky-planet-function/south-node`
40. `fallback-vocab/sky-planet-function/sun`

The machine-readable source of this inventory is `apps/web/src/content/fallbackArchitectureV3/contracts/FRIEND-NATAL-SECOND-PERSON-VOCABULARY-V1.json`. The other 680 vocabulary rows continue to resolve from `body` in both voices.

## Empty-detail UX guard

All Friends detail openers now pass through one non-empty-content guard. It covers:

- Compatibility
- Natal placement
- Natal aspect
- Natal aspect pattern
- Natal empty house
- Synastry contact
- House transit
- Personal transit
- Bond transit

Natal placement, natal aspect, and empty-house rows are disabled when their current governed content resolves to no eligible body. Composite currently exposes no detail opener; if one is added, the shared guard is the required boundary.

## Regression gate

`scripts/test-friends-natal-fallback-runtime.mjs` is suite-wired and asserts:

- the 720 / 0 / 0 vocabulary field counts;
- exactly 680 Friend-safe `body` fallbacks and exactly 40 governed failures;
- an ordinary Friend natal placement and natal aspect render non-empty after the deferred bundle loads;
- the Friends Natal request triggers that load;
- no Friends detail opener bypasses the shared non-empty guard;
- a heading-only detail fails the guard.
