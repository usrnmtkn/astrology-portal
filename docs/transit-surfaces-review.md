# Transit Surfaces Review

**Status:** Review findings
**Last updated:** 2026-08-07
**Related:** [return-reports-implementation-plan.md](./return-reports-implementation-plan.md), [premium-reports-task-breakdown.md](./premium-reports-task-breakdown.md)

Review of everything transit-related a user sees today, prompted by the question: can the return-report book doctrine (multi-pass structure, Saturn reality-test content, return categories, planner-style key dates) enrich the existing transit pages? Short answer: yes, and the review found that much of the needed machinery already exists in the repo but is wired to the wrong surface or not wired at all.

## 1. What exists today

Every personal transit row the user sees is computed **in-browser** (`buildNatalTransitItems`, `App.tsx:5372`) from the WASM ephemeris. Surfaces: the You → Transits tab (daily rows, weekly section, house transits, "behind this forecast," article page, biwheel), the friend-profile Transits tab (bond + personal grouped), and pattern-activation cards. Prose resolves through Fallback V3 authored rows first (377 authored transit-aspect cards), then composed templates, with the astro-knowledge `transitNatal` matrix (550 one-line entries, 46% DRAFT) as an LLM hint layer.

The FastAPI `/personal` endpoint computes a parallel, differently-weighted transit list that is **never rendered** — only its headline/summary card is shown. The app runs two transit engines with different orbs and results; only the browser one reaches users.

## 2. Bugs and dead machinery (fix regardless of any new features)

1. **`TransitItem.direction` is never populated for real data** (`App.tsx:5388-5403`; only `sampleTransits` sets it). Cascade: `transitItemExactDate` returns *today* for every transit (wrong "Exact:" labels on pattern-activation cards), the applying/separating arrow never renders, the ranking engine's applying bonus is inert, and the LLM receives `direction: undefined`.
2. **Transit windows ignore retrograde motion** — `transitItemActiveWindow` divides remaining orb by average daily motion, symmetric around today. A stationing Saturn gets an implausibly short window pointing the wrong way.
3. **`you_transit` LLM content is generated, stored, and never displayed** (`App.tsx:12069-12217` generates; `personalizedContentKey` at :16008 is used only as an article id; no `.get(contentKey)` lookup exists). This is paid generation with zero reader value — either render it or stop generating it.
4. **`TransitHit.exactAt` hardcoded `None`** server-side (`transits.py:157`) even though the server correctly computes applying/separating phase that nothing renders.
5. **Return detection is a 0.25° single-day trigger in the weekly lane only** (`weeklyHoroscope.ts:1336`). A Saturn return — a ~9-month, 3-pass event — is never surfaced on the You page at all, and only 8 authored return cards exist (no sun/uranus/neptune/pluto).

## 3. The one high-leverage change

**Port `skyAspectTimingFor` / `enrichSkyAspectTiming` (`ephemeris.ts:1971-2153`) from sky-to-sky to transit-to-natal.** The multi-pass engine the book doctrine calls for — `passIndex`, `exactPasses[]` with per-pass motion, retrograde re-hit clustering, engagement windows, `series: {index, count}` — is already implemented and shipping on the Sky surface. Natal targets are *simpler* (one moving body against a fixed longitude). This single port supplies: exact dates, pass numbers, per-pass retrograde/direct motion, and honest windows for every personal transit — fixing §2.1–2.2 and enabling everything in §4.

Two integration traps:
- `dedupeSameBeatPersonalTransits` (`App.tsx:7144`) dedupes by resolved content key and would collapse three passes of one transit into one row — pass-aware keys must thread through it.
- Decide which engine owns pass math (recommendation: browser for live surfaces via this port; server `/timing/*` for report facts, per the return-reports plan §3) and check drift in the existing integrity workflow.

## 4. Where the book doctrine plugs in

1. **Pass labels (Jacobs: awareness → review → action).** With the §3 port, daily/article transit rows can say "second of three passes — review, not push." Key-space is ready: authored keys support a trailing segment (`authored/transit-aspect/{t}/{n}/{aspect}/pass-{1|2|3}` slots into the existing `tryKeys` cascade), `transitToNatalAspectInstanceContentKey` takes a two-line `pass` option, and the flat LLM key + DB uniqueness already accommodate a `pass2` suffix. **The doctrine is even already authored**: `packages/astro-knowledge/data/frameworks/planetary-return-framework.json` contains the three-pass model verbatim (`retrograde-return-series`) with zero code references.
2. **Saturn reality-test per-aspect cards (Tierney).** Current authored Saturn coverage is by aspect *group* (`conjunction|hard|soft`) — Saturn square Sun and Saturn opposition Sun serve identical copy. Tierney's transiting-Saturn-to-each-natal-planet material ("repair what's salvageable, terminate what's outgrown") is the source for differentiating the hard aspects, the highest-value thin spot in the 377-card set.
3. **Returns as a first-class category (Dykes: a planet on its own natal place activates that natal promise).** Generalize the nodal-only `renderTransitReturn` call (`App.tsx:7220`) to all self-conjunctions, replace the 0.25° day-trigger with a real window (orb + pass structure from §3), fill the missing return cards (sun, uranus, neptune, pluto), and wire the unwired cycle files (`saturn-return.json` — which already specifies exact-timing-not-age, station-proximity loudness, and cycle milestones — `jupiter-return-cycle.json`, `nodal-return-cycle.json`, etc.). This is also the Year Ahead / Saturn Return add-on highlight surface.
4. **Station-on-natal awareness (loudness rule from `saturn-return.json` + Jacobs).** `findStations` / `retrogradeCycleFactsFor` (`ephemeris.ts:1349-1486`) already produce station timestamps and shadow windows; nothing checks proximity to natal degrees. A station within 1–2° of a natal point should upgrade the transit's prominence and copy ("Saturn stations on your natal Venus — this pass lingers"). The 18 authored station cards can gain natal-contact variants.
5. **Planner-layer key dates (Kent).** Sun crossing natal angles (4 dates/year), eclipses on natal-sensitive degrees, and retrograde windows have zero personal-surface presence today (`grep eclipse features/you` is empty). These feed personal-timing key dates and the Year Ahead season key-date lists — same facts pipeline as task Y2.
6. **Guardian-angel tone (Tierney/Greene).** Applies to Saturn transit copy generally; add to prompt tone rules and the RD1 doctrine docs so both report generators and transit-card prompts consume it.

## 5. Content-quality flags

- The `transitNatal` 550-file matrix embeds `policy`/`note` boilerplate into `detailParagraphs` (`domainRegistry.ts:600`) — one note literally reads "Source file was not copied into the repository." If any surface falls through to this layer it prints scaffolding. Guard or strip.
- 255 of 550 matrix entries are `DRAFT`; `saturn_saturn_conjunction` — the Saturn return! — is a one-line DRAFT.
- `isRetrograde` isn't passed on the main You path (`App.tsx:7246-7254`) and authored cards ignore it when passed, so the existing "this contact usually repeats" line can't reach the primary surface.

## 6. Suggested sequencing

1. Bug fixes standalone (§2.1–2.2 direction/window math; kill or wire `you_transit` display).
2. The §3 pass-engine port (prerequisite for everything else; shares math with report task Y2 — build once, expose to both).
3. Pass labels + return category + station-loudness (§4.1, 4.3, 4.4) — the visible differentiation.
4. Tierney Saturn card pass (§4.2) and planner key dates (§4.5) — content authoring, parallel with RD1.
