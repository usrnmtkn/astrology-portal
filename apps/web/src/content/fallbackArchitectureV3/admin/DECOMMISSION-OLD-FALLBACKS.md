# Decommission old fallback copy

Rule: when a surface switches to the v3 package, the old fallback path for that surface is REMOVED from the selection path, not left underneath as a last resort. Selection is authored-or-v3-package-or-SOURCE_GAP. Any legacy helper still reachable will eventually render, and it will render the old fragment copy.

This applies to every current and future import step. Every future handoff for a new surface (transits, synastry, composite, daily) must ship with its own decommission list like this one.

## Known legacy paths to remove (from the 2026-07-21 app package audit)

| Legacy item | Where it lived | Action |
|---|---|---|
| Old aspect fallback function (last-resort helper under aspect selection) | app selection path (found by Codex during import) | Remove from selection path. Aspects are authored-or-v3 (`renderNatalAspect`), else SOURCE_GAP. Delete the helper once nothing references it. |
| `{{core_behavior}} {{house_synthesis}}` concatenation | `finalSourceGroundedDashboardRecords.json` natal-placement records (1,439) | Stop rendering these templates. Reclassify the clauses as `fallback_source` per the role migration map. Do not delete the clause text; it is authoring material. |
| `{{experience}} {{guidance}}`, `{{headline}} {{immediate_observation}} ...` concatenations | same file, you-and-friend records | Same treatment: never render, reclassify `fallback_source`. |
| Thin natal fallback bodies ("This placement describes how {{planet}} works through {{sign}} qualities...") | `fallbackHooks.ts` copy guidance + `tldrastro-fallback-templates-rows.json` natal rows | Replaced by `fallback-template/natal.planet-in-sign`, `natal.house-context`, `natal.node-in-sign`, `natal.angle-in-sign`, `natal.aspect`. Remove the old bodies from any render path. |
| Old adjective `sign-style` rows and other superseded vocab | `tldrastro-fallback-language-rows.json` | v3 `source-rows/fallback-source-rows-v3.json` is the single vocabulary source. Retire the old rows from selection; keep as `fallback_source` history if useful. |
| Hardcoded `planetTopicVocabulary` and emergency composer word banks | app code (noted in the old language-rows file itself) | Delete the hardcoded banks. Any emergency composer reads v3 rows or nothing. |
| `text_they` pronoun-substituted variants ("their drive comes straight through they") | old dashboard clause records | Never render. v3 hooks carry authored `body_you` / `body_they`; there is no pronoun substitution anywhere. |
| Old mustache natal templates (5A-5K etc.) as fallback | `sourceGroundedMustacheV22.ts` / handoff v2 docs | Those remain the AUTHORED-lane spec for writing `full_copy`. They are not a fallback path; remove any code that renders them with unreviewed slot values. |

### Added for the transit + synastry import (v1)

| Legacy item | Where it lived | Action |
|---|---|---|
| Old thin transit templates (`fallback-hook/you.transit-to-natal`, `you.transit-through-house`, `you.transit-to-angle`, `you.daily-timing`, `sky.*`) | old templates-rows file / fallbackHooks.ts | Replaced by the authored card library (`transit-synastry-rows-v1.json`) + `renderTransitSynastry.mjs`. Remove from selection paths. |
| Old synastry/composite templates (`friends.synastry-contact`, `friends.composite-*`, `friends.house-overlay`, `friends.same-planet`, `friends.relationship-timing`) | same | Compat surfaces now use authored compat cards; synastry aspects use `fallback-template/synastry.aspect-v3`. Remove old bodies from selection. |
| Any old compatibility snippet merge logic (the "You both're" string-substitution bug class) | app compat renderer | Delete. Same-sign pairs render the authored same-sign cards only; no pluralization by substitution, ever. |
| Reversed-direction pair renders | app compat renderer | Mercury/Venus/Mars/Jupiter/Saturn pair cards are directional (390 authored). The resolver refuses reversed lookups by design; do not "fix" by swapping names. |

### CONFIRMED LIVE BUG (owner screenshot, 2026-07-21 evening)

Friend-view natal aspects are rendering pronoun-substituted you-voice ("with no pressure on they", "when they actually use them"). The v3 package renders these correctly via `renderNatalAspect({ ..., voice: friendName })`, which selects the authored `body_they` variants. The app is bypassing the voice path and string-replacing "you" -> "they" somewhere. Find and delete that substitution; pass the friend's name as `voice` instead. Regression check: render Sun sextile Neptune in friend view and assert the output contains "with no pressure, they can float" and does NOT contain "on they".

## Verification (run after each removal)

1. Grep the app for the legacy entry points: the old aspect helper name, `core_behavior`, `house_synthesis`, `planetTopicVocabulary`, old `fallback-hook/you.natal-*` keys, `text_they`. Every remaining reference must be admin-display or authoring-side, never a render path.
2. Force the fallback branch in QA (a chart combination with no authored `full_copy`) for each surface: placements, angles, aspects. Confirm output matches the v3 resolver output exactly. Any sentence not producible by v3 templates + rows means a legacy path is still live.
3. Force a SOURCE_GAP (e.g. a quincunx, or a body outside the 13 covered): confirm the surface shows the designated empty/emergency state, not old copy.
4. Add a regression check with a few known legacy strings ("qualities in the chart", "this part of them", "works through", "their drive comes straight through") asserted absent from rendered output across the QA chart set. The v3 test's BANNED list is the starting point.

## Why not keep the old helper as a safety net

The v3 package guarantees a complete paragraph for every covered combination, so the net never catches anything legitimate; it only catches cases the contract says must NOT render (out-of-package points, missing sources). A net there converts intentional SOURCE_GAPs back into unapproved copy, silently. If coverage is missing, the fix is a new approved row, never a resurrected helper.
