# Prompt: Fix transit direction/window bugs

Copy everything below into a fresh coding session.

---

Fix three related bugs in the personal transit pipeline in this repo (context doc: `docs/transit-surfaces-review.md` §2). Do not add new features — this is a correctness pass.

## Bug 1: `TransitItem.direction` is never populated for real data

`buildNatalTransitItems` in `apps/web/src/App.tsx` (~line 5372, mapping at ~5388-5403) builds transit rows from ephemeris positions but omits `direction`. Only the hardcoded `sampleTransits` (~line 3727) ever set `"applying" | "separating"`.

Fix: compute direction in `buildNatalTransitItems`. Applying = the orb to exact aspect is decreasing; determine via the transiting planet's current longitude speed relative to the natal point's fixed longitude (the ephemeris service in `apps/web/src/services/ephemeris.ts` already exposes planet speeds — see how `exactPlanetSpeed` is used around line 2000). Handle retrograde correctly: a retrograding planet can be applying to an aspect it previously separated from.

Downstream effects that must now work (verify each):
- `transitItemExactDate` (~App.tsx:5515): currently `exactOffsetDays = 0` for every transit, so "Exact:" labels on natal-aspect-pattern activation cards always show today. After the fix, applying transits get a future estimate, separating get a past one. Sanity-check the estimate uses signed current speed, not average motion, when speed is available.
- The applying/separating arrow in the legacy `TransitList` (~App.tsx:15566) renders again.
- `rankedTransitItems` (~App.tsx:6797) passes `phase: transit.direction` — the ranking engine's applying bonus becomes live. Check ranking snapshots/tests for intended changes.
- `compactTransitItemFact` (~App.tsx:1505) now sends real `direction` to LLM facts.

## Bug 2: transit windows ignore retrograde motion

`transitItemActiveWindow` (~App.tsx:5496) computes `remainingOrb / averageDailyMotion[planet]`, symmetric around today — wrong for stationing or retrograding planets. Improve minimally (a full pass-scan engine is planned separately; do NOT build it here): use the signed current speed when available instead of the average-motion table, clamp to a sane max window per planet, and when |speed| is below a small station threshold, widen the window and prefer the existing duration label wording over a precise range. Keep the function's return shape unchanged.

## Bug 3: `you_transit` LLM content is generated, stored, and never displayed

`App.tsx` ~12069-12217 generates per-transit `you_transit` content into `user_generated_interpretations` on profile load (8 transits, sequential). The result (`personalTransitGeneratedContent`) is threaded to the You subtree but never looked up — `personalizedContentKey` (~16008) is only used as an article id. This is paid generation with zero reader value.

Fix — wire the display (do not remove generation): in `YouTransitArticlePage` (`apps/web/src/features/you/YouPage.tsx` ~777-1000), when a `you_transit` row exists for the article's content key and its status is LIVE, render its `headline`/`body`/`sections` as the article body, with the existing authored/fallback content as the non-LIVE fallback. Respect the repo's content precedence rules (`AGENTS.md`, `docs/content-management/ARCHITECTURE.md`): generated content must not displace approved authored rows unless status is LIVE. All rendered strings pass the existing reader-safety helpers (`apps/web/src/content/readerSafety.ts`). Also add a guard so generation is skipped when a LIVE row already exists for the same key+date (check the existing load path in `apps/web/src/services/userGeneratedContent.ts`).

## Server-side companion fix

`services/tldrastro-api/src/tldrastro_api/services/transits.py` line ~157 hardcodes `TransitHit.exactAt = None` even though `_phase_for_transit` (~82-95) computes applying/separating. Populate `exactAt` with a bisection estimate using the existing `_bisect_aspect_exact` machinery in `services/chart.py` (~405) when the hit is applying and within orb; leave `None` when separating with no upcoming exactness. Add a unit test in `services/tldrastro-api/tests/`.

## Constraints

- No new prose in React; never synthesize reader-facing astrology text in components (Fallback V3 rule: SOURCE_GAP means omit).
- Don't touch content files or prompts.
- Run existing gates: web type-check/tests, `npm run test:content`, `npm run qa:bundle`, and the Python service tests.
- `App.tsx` is 18k lines — keep edits surgical; extract helpers to `apps/web/src/services/` if a change grows beyond ~30 lines.

## Verification

For a known fixture chart, assert: (1) a currently-applying Saturn transit shows a future exact date within a plausible range; (2) a retrograding planet's transit direction matches ephemeris reality for the test date; (3) the You transit article renders LIVE generated content and falls back correctly otherwise; (4) server `exactAt` matches the browser estimate within a day for the same transit.
