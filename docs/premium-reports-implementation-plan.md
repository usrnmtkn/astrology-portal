# Premium Reports Implementation Plan: Year Ahead + Relationship

**Status:** Draft
**Last updated:** 2026-08-07
**Reference:** Co-Star's "Year Ahead Report" and "In Love" premium readings (screenshots reviewed 2026-08-07)

## 1. What Co-Star ships, deconstructed

Both reports share one production formula: **deterministic astrology facts select pre-structured narrative slots, and every claim carries a visible attribution line.**

### Year Ahead report (solar-return-to-solar-return, birthday-anchored)

- Cover: `@handle`'s year of `<theme>` + date range (solar return to solar return) + big-three line.
- Five seasonal chapters (this winter → next winter), each with:
  - A titled theme ("Making them work for it", "Finding solid ground").
  - Two paragraphs: a backstory/pattern paragraph (natal-derived, second person, childhood framing) + a season-forecast paragraph with concrete directives.
  - One attribution line: "During this season, Uranus squares your natal Mercury."
- Per-season **Key dates**: date ranges, a short title, a category tag (`WORK | SELF | SEX & LOVE | FRIENDS & FAMILY`), and a bottom-sheet detail with 2–3 sentences plus its own attribution ("At this time, Mercury is conjunct your natal Mercury"). Solar return itself appears as a key date ("Your 46th birthday").
- "Looking ahead" closer: a year-level thesis + two forward paragraphs.
- Colophon: reading period, handle, birth date/place.

### Relationship report ("Jose in love")

- Subject is a **friend's** chart, written in third person, readable by the viewer.
- Header: friend's big three.
- Sections: "Where they're coming from" (family/attachment backstory from natal Moon/IC), "In a relationship" (Venus/Mars/7th-house behavior), etc.
- Per-section attribution: "Based on their ☉ Aquarius ☽ Cancer."

Design takeaways to copy: attribution lines are the trust mechanism; category tags make a transit list scannable; the backstory-then-forecast paragraph pair is the chapter template; everything is derived from calculations we already run or nearly run.

## 2. What we already have (from repo audit)

| Need | State |
|---|---|
| Annual frame (profections, Lord of the Year) | ✅ `services/tldrastro-api/.../services/profections.py`, already consumed via `/personal` |
| Transit-to-natal engine w/ exact-hit bisection | ✅ `services/chart.py` `_bisect_aspect_exact` (:405) — but no date-range scan endpoint; `TransitHit.exactAt` hardcoded `None` |
| Year-range mundane events (lunations, eclipses, stations, ingresses) | ✅ `getLunarCalendarRangeEvents()` (`apps/web/src/services/ephemeris.ts:2481`) |
| Synastry + composite calculation | ✅ **twice**: browser `chartMath.ts` and dormant, tested FastAPI `/synastry` + `/composite` (zero call sites) |
| Per-user LLM generation pipeline | ✅ `api/generate-user-content.ts` → `user_generated_interpretations`; subject types `synastry_summary`, `composite_summary` etc. already declared but unwired |
| Relationship voice prompt | ✅ `synastryWritingSystemPrompt()` (`api/_lib/content-generation.ts:2481`) |
| Provider routing for relationship content | ✅ `CONTENT_GENERATION_PROVIDER_RELATIONSHIP` in `api/_lib/provider-config.ts` |
| Long-form article renderer | ✅ `SkyDetailArticle.tsx` pattern; period-narrative assembly precedent in `weeklyHoroscope.ts` |
| Friend charts + sharing consent | ✅ `manual_charts`, `social_friendships`, per-side chart-sharing invariants (`socialFriends.ts`) |
| Solar returns, progressions | ❌ none |
| `report` content mode | ❌ DB CHECK constraints allow only `feed\|in_depth\|article` |
| Paywall/entitlements | ❌ nothing (greenfield; out of scope here, see §7) |

## 3. Shared foundation (build once, both reports use it)

### 3.1 Migration: `report` mode

Add `report` to the `mode` CHECK constraints on `generated_interpretations` and `user_generated_interpretations`, and add subject types `year_ahead`, `year_ahead_season`, `year_ahead_key_date`, `relationship_report` to the union in `api/generate-user-content.ts:12` and `apps/web/src/services/userGeneratedContent.ts:4`.

### 3.2 Report envelope

A report is not one generation — it is a **structured set of units generated from one deterministic fact bundle**, stored per-unit so regeneration and review are granular:

```
report (subject_type, subject_id, period_start, period_end)
├── facts jsonb        ← deterministic astrology bundle, engine-stamped, cached
├── units[]            ← one user_generated_interpretations row per chapter/section/key-date
└── status             ← draft → needs_review → approved → live (matches editorial regime)
```

Facts are computed first and frozen; prose generation reads only the frozen bundle. This keeps attribution lines honest (they render from `facts`, never from LLM output) and satisfies the reader-safety rule that React never synthesizes astrological claims.

### 3.3 Engine canonization

**Decision: the FastAPI service is canonical for report facts.** Reports are premium, cacheable, and generated server-side anyway; the browser engine stays canonical for live interactive surfaces (wheels, daily). This finally gives the dormant `/synastry`/`/composite` endpoints their consumer and avoids shipping a second 12-month scan in WASM.

### 3.4 Attribution renderer

One shared component that formats a `facts` aspect record into Co-Star-style lines ("During this season, Uranus squares your natal Mercury" / "Based on their ☉ Aquarius ☽ Cancer"), with glyphs from `chartAssets.ts`. Copy passes `isReaderFacingCopy`.

## 4. Year Ahead report

### 4.1 New calculation work (the real engineering)

New endpoint `POST /timing/year` in `services/tldrastro-api`:

1. **Window**: solar return to solar return. Requires a minimal solar-return solver — find the moment the transiting Sun returns to natal Sun longitude (reuse `_bisect_aspect_exact` machinery; a full solar-return *chart* is optional v2, the timestamp is enough for v1).
2. **Season slicing**: split the window into 4–5 chapters. Recommended v1: astronomical seasons (solstice/equinox cuts, matching Co-Star's WINTER/SPRING/… labels) — ingress dates already computable.
3. **Slow-transit scan**: for Jupiter→Pluto (+ Chiron) against natal planets/angles, scan the window, bisect exact dates, and emit hits with applying/exact/separating ranges. Fixes the `exactAt = None` gap in `transits.py:157`.
4. **Fast-transit key dates**: Mercury/Venus/Mars/Sun hits to natal planets, scored and pruned to ~4–6 per season. Score = existing personal-timing weighting + profection Lord bonus.
5. **Categorization**: map each hit to `WORK | SELF | SEX & LOVE | FRIENDS & FAMILY` deterministically from (transiting planet, natal planet, natal house) — a static lookup table in the knowledge package, not LLM judgment.
6. **Merge mundane events**: eclipses/lunations falling on natal-sensitive degrees (from `getLunarCalendarRangeEvents` logic, ported or exposed server-side) + the solar return itself as a key date.
7. **Season headline aspect**: pick the single highest-scoring slow transit per season — this becomes the chapter's attribution line and the anchor for its forecast paragraph.

Add tests mirroring `test_synastry.py` style; run the JPL Horizons integrity gate over sampled exact dates.

### 4.2 Content model & generation

Per-unit prompts (extending `buildPrompt()` + style guide), each grounded in the frozen facts bundle:

- `year_ahead` cover unit: year theme title ("year of coming home") + "Looking ahead" closer. Grounded in profection Lord + dominant slow transit.
- `year_ahead_season` ×4–5: paragraph 1 = natal pattern backstory (grounded in the natal placements the season's headline transit activates); paragraph 2 = forecast with directives. Hard rule: prose may not name planets/aspects — the attribution line does that.
- `year_ahead_key_date` ×~20: 2–3 sentences each, category-toned.

All units flow through the existing editorial gates (`evaluateEditorialCoherence`, banned phrases) and land as `needs_review` per `AGENTS.md`; the satori-writer skill governs the copy pass. Budget real owner-review time: a full report is ~25 units.

### 4.3 UI

New route `#/you/year-ahead` (thin route shell + `features/you/YearAheadReport.tsx` — do **not** grow `App.tsx`). Structure clones the Co-Star flow using existing conventions:

- Cover page (Newsreader display, big-three line, date range).
- Chapter index (season list with thumbnails) → chapter view (`SkyDetailArticle` section pattern: image, kicker, title, two paragraphs, attribution line in Geist Mono dotted-underline style).
- Key dates list per chapter; tapping opens a bottom sheet (reuse the pattern from personal-timing detail) with copy + attribution.
- Colophon.
- New CSS file `styles/year-ahead.css` using existing tokens; check `qa:bundle`.

## 5. Relationship report

Mostly assembly: calculations, subject types, voice prompt, and the Friends workspace all exist.

### 5.1 Facts

For a friendship (or `manual_chart` with `relationship_type`), compose the facts bundle from three existing calls: friend natal (`/chart/natal`), synastry (`/synastry` — first real call site), composite (`/composite`). Respect the sharing invariants: if the friend has paused chart sharing, the report is unavailable — enforced in SQL/API, not React, per `socialFriends.ts` invariants.

### 5.2 Sections (v1, mirroring "Jose in love")

1. **Where they're coming from** — friend natal Moon, IC/4th, Saturn contacts. Attribution: "Based on their ☉ … ☽ …".
2. **In a relationship** — friend Venus, Mars, 7th house.
3. **How you two collide** — top 3–5 scored synastry contacts (`synastry.py` weighting). Attribution per contact.
4. **What you build together** — composite Sun/Moon/angles summary.
5. **What to watch** — hardest synastry aspect, constructively framed.

Third-person POV throughout for sections 1–2 (the existing `synastryWritingSystemPrompt` already encodes POV rules), second-person-plural for 3–5. Reuse authored material first per Fallback V3 precedence: `synastry.json` / `composite.json` bundles and `transit-synastry-rows-v1.json` seed the prompts as approved-example context.

### 5.3 UI

New tab or entry point in the existing friend workspace (`features/friends/`), alongside `FriendSynastryTab`/`CompatibilityTab`: "Full reading" → long-form article view reusing the same renderer as §4.3. Optional header wheel via existing `SynastryWheel.tsx`.

### 5.4 Ethical guardrail

Co-Star's report psychoanalyzes a third party who never consented to that framing. Ours should stay within what the friend has shared: gate the report on active mutual friendship + chart sharing on, and keep the tone descriptive rather than diagnostic (the editorial banned-phrase list should grow a "diagnosing others" section).

## 6. Delivery plan

Ordered so the relationship report ships first (least new engineering, exercises the whole shared foundation):

1. **Foundation (week 1):** `report` mode migration, subject types, report envelope + facts caching, attribution renderer.
2. **Relationship report (weeks 1–3):** wire `/synastry` + `/composite`, facts composer, 5 section generators, friend-workspace UI, editorial review cycle.
3. **Year Ahead calculations (weeks 3–5):** solar-return timestamp solver, `/timing/year` range scan with exact dates, categorization table, integrity tests.
4. **Year Ahead content + UI (weeks 5–7):** unit generators, review cycle (largest copy-approval load), report UI, key-date sheets.
5. **Hardening (week 7–8):** regeneration policy (facts frozen per period; regenerate on birth-data edit), content contract tests (`npm run test:content` additions), bundle budgets, QA.

Indicative: **7–8 weeks** for one full-stack engineer plus owner editorial time. Relationship report alone is a **~3-week** dogfoodable release.

## 7. Out of scope / open questions

- **Monetization**: zero paywall infrastructure exists. These reports are the obvious premium anchor, but entitlements (Stripe vs. app-store-less web billing) deserve their own plan; v1 can ship owner/beta-gated.
- **Solar return chart & progressions**: timestamp-only in v1; full SR chart interpretation and secondary progressions are natural v2 depth for Year Ahead.
- **Season slicing**: astronomical seasons (recommended) vs. profection-relevant cuts — confirm before building the slicer.
- **Regeneration on birthday**: does a user's Year Ahead auto-refresh at solar return, and is that a re-purchase moment?
- **Engine drift**: server-canonical facts vs. browser-computed wheels could disagree at orb edges; the integrity gate should compare both engines on report facts.
