# Premium Reports — Engineering Task Breakdown

**Status:** Draft
**Last updated:** 2026-08-07
**Parent plan:** [premium-reports-implementation-plan.md](./premium-reports-implementation-plan.md)

Tasks are ordered for execution. Each lists files touched and a done-check. IDs are referenced in dependency notes. Phases match the parent plan: F = foundation, R = relationship report, Y = year ahead, H = hardening.

---

## Phase F — Shared foundation

### F1. Migration: `report` mode + report subject types

**Files**
- New: `apps/web/supabase/migrations/2026XXXXXXXXXX_premium_report_mode.sql`

**Work**
- Extend `mode` CHECK constraints on `generated_interpretations` and `user_generated_interpretations` to `('feed','in_depth','article','report')`.
- Extend `surface` CHECK on both tables with `year_ahead` (relationship report reuses existing `relationship` surface).
- No new tables yet (report envelope lives in F3).

**Done when:** migration applies clean on a shadow DB; existing rows unaffected; RLS unchanged.

### F2. Subject-type unions + provider routing

**Files**
- `api/generate-user-content.ts` (union at ~line 12)
- `apps/web/src/services/userGeneratedContent.ts` (union at ~line 4)
- `api/_lib/provider-config.ts`

**Work**
- Add `"year_ahead" | "year_ahead_season" | "year_ahead_key_date" | "year_ahead_sr_moment" | "year_ahead_sr_stance" | "year_ahead_sr_sun" | "year_ahead_headline" | "year_ahead_saturn_return_callout" | "relationship_report_section" | "saturn_return" | "saturn_return_section"` to both `UserContentSubjectType` and `UserGeneratedSubjectType` (keep the two unions identical; consider extracting to a shared type to stop the duplication).
- Route the new types: `year_ahead*` → default provider, `relationship_report_section` → `CONTENT_GENERATION_PROVIDER_RELATIONSHIP`.

**Done when:** type-check passes; a manual `generate-user-content` call with a new subject type persists a row.

### F3. Report envelope table + facts cache

**Files**
- New: `apps/web/supabase/migrations/2026XXXXXXXXXX_premium_reports_envelope.sql`
- New: `api/_lib/report-envelope.ts`

**Work**
- Table `user_reports`: `id`, `user_id`, `report_type` (`year_ahead|relationship`), `subject_id` (friendship id / manual chart id / null for self), `period_start`, `period_end`, `facts jsonb`, `facts_engine` (provenance stamp), `status` (`draft|needs_review|approved|live`), timestamps. Unique on `(user_id, report_type, subject_id, period_start)`. RLS: owner read; service-role write.
- Envelope helper: create/fetch report row, freeze facts, list child units by `content_key` prefix `report:{report_id}:*`.

**Done when:** envelope helper round-trips a report with frozen facts and linked units in a script test (`scripts/test-report-envelope.mjs`, mirroring `scripts/test-pair-daily.mjs` style).

### F4. Attribution renderer

**Files**
- New: `apps/web/src/components/reports/AttributionLine.tsx`
- New: `apps/web/src/components/reports/attributionFormat.ts` + unit tests

**Work**
- Format a facts aspect record into: "During this season, Uranus squares your natal Mercury." / "At this time, Mercury is conjunct your natal Mercury." / "Based on their ☉ Aquarius ☽ Cancer."
- Glyphs via `components/charts/chartAssets.ts`; dotted-underline Geist Mono style per `docs/design-tokens.md` (add token if a new underline style is needed — no one-off CSS).
- All output passes `isReaderFacingCopy` (`apps/web/src/content/readerSafety.ts`).

**Done when:** unit tests cover every aspect type + conjunct/square/trine/sextile/opposition verb forms; renders in Storybook-less harness or a dev route.

### F5. Long-form report renderer

**Files**
- New: `apps/web/src/components/reports/ReportArticle.tsx`
- New: `apps/web/src/styles/report-article.css`

**Work**
- Generalize the `SkyDetailArticle.tsx` section pattern (kicker/title/paragraphs/attribution/sourceTag) into a report-agnostic renderer: cover block, chapter/section blocks, key-date list, bottom-sheet detail, colophon.
- Reuse heading dedup (`utils/articleHeadings`), tokens only, budget-checked.
- Deduplicate `react` and `react-dom` in Vite so the dev-only report fixture entry shares the app's React runtime.
- Add a dedicated mobile Playwright fixture check for the long-form renderer and bottom sheet.

**Done when:** renders a fixture report JSON end-to-end; `npm run qa:bundle` passes.

---

## Phase R — Relationship report (ships first)

### R1. Wire dormant synastry/composite endpoints

**Files**
- `apps/web/src/services/tldrastroApi.ts` (`getSynastry` :204, `getComposite` :208 — first real call sites)
- New: `api/_lib/relationship-facts.ts`

**Work**
- Server-side facts composer: given viewer + friend chart inputs, call FastAPI `/chart/natal` (friend), `/synastry`, `/composite`; normalize into one facts bundle `{friendNatal, contacts[], overlays[], composite}` with engine provenance.
- Contact selection: top 3–5 by `synastry.py` weighted score; hardest aspect flagged for the "What to watch" section.
- Implementation note: the canonical `/synastry` response does not emit applying/separating. The composer preserves those fields when present and never synthesizes them. If a future section needs aspect phase, add it in the FastAPI service, not the composer.

**Done when:** facts bundle for two fixture charts matches expected contacts in a script test; results cross-checked against browser `chartMath.calculatedSynastryContacts()` within orb tolerance (log drift, don't fail — feeds H3).

### R2. Sharing-consent gate

**Files**
- `api/_lib/relationship-facts.ts` (server check)
- Migration if needed: SQL helper to assert active mutual friendship + chart sharing enabled

**Work**
- Report generation and reads refuse unless: active `social_friendships` row AND friend's chart sharing on (paused chart ⇒ SQL returns null per `socialFriends.ts` invariants), OR subject is an owner-created `manual_chart`.
- Enforced in SQL/API, never React.

**Done when:** test proves a paused-sharing friend yields 403/null at the API layer.

### R3. Section generators (5 units)

**Files**
- `api/_lib/content-generation.ts` (new prompt builders alongside `synastryWritingSystemPrompt` :2481)
- `api/generate-user-content.ts` (accept `relationship_report_section` + section id)

**Work**
- Sections: `origins` (natal Moon/IC/Saturn, third person), `in_relationship` (Venus/Mars/7th, third person), `collision` (top synastry contacts, second-person-plural), `together` (composite Sun/Moon/angles), `watch` (hardest aspect, constructive).
- Prompts grounded only in frozen facts; prose forbidden from naming planets/aspects (attribution lines carry that). Seed approved-example context from `packages/astro-knowledge/dist/synastry.json`, `composite.json`, and `fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json`.
- Extend `editorialBannedPhrases` with a diagnosing-others section (per parent plan §5.4).
- All output lands `DRAFT`/`needs_review`; satori-writer skill governs the copy pass per `AGENTS.md`.

**Done when:** all 5 sections generate for fixture pair, pass `evaluateEditorialCoherence`, and persist as report units under one envelope.

### R4. Friend workspace UI

**Files**
- `apps/web/src/features/friends/` — new `FriendReportTab.tsx` (or entry card) alongside `FriendSynastryTab.tsx`
- Route wiring in `App.tsx` (thin; render logic stays in features/)
- `apps/web/src/styles/report-article.css` additions

**Work**
- "Full reading" entry from the friend workspace → `ReportArticle` with friend big-three header (optional `SynastryWheel.tsx` header), 5 sections with attributions, colophon.
- Loading/generation states: request generation if no live report; poll/refresh on completion.

**Done when:** end-to-end flow works against a real friendship in dev; paused-sharing friend shows the unavailable state.

### R5. Relationship report review cycle

**Work**
- Generate reports for 3–5 real/fixture pairs; owner reviews exact wording in the admin dashboard (`apps/admin/src/GeneratedContentAdminDashboard.tsx` — extend filters to `mode = report` if needed).
- Iterate prompts until approval rate is acceptable; document approved examples back into prompt context.

**Done when:** one fully approved report is live for a dogfood account.

---

## Phase Y — Year Ahead

### Y1. Solar-return timestamp solver

**Files**
- `services/tldrastro-api/src/tldrastro_api/services/solar_return.py` (new)
- `services/tldrastro-api/tests/test_solar_return.py` (new)

**Work**
- Find transiting-Sun-conjunct-natal-Sun moment nearest a given birthday, reusing `_bisect_aspect_exact` machinery from `services/chart.py:405`. Timestamp only (full SR chart is v2).

**Done when:** tests verify known solar returns within ±1 minute against Horizons-checked fixtures.

### Y2. `/timing/year` range scan

**Files**
- `services/tldrastro-api/src/tldrastro_api/routers/timing.py` (new endpoint)
- `services/tldrastro-api/src/tldrastro_api/services/year_ahead.py` (new)
- `services/tldrastro-api/src/tldrastro_api/services/transits.py` (fix `TransitHit.exactAt = None` at :157)
- Tests: `tests/test_year_ahead.py`

**Work**
- Input: natal chart + window (solar return → solar return, from Y1).
- Slow scan: Jupiter→Pluto + Chiron vs. natal planets/angles; bisected exact dates; applying/exact/separating ranges; retrograde multi-pass hits merged into one arc with multiple exact dates.
- Fast scan: Sun/Mercury/Venus/Mars hits, scored (personal-timing weights + profection-Lord bonus from `services/profections.py`), pruned to 4–6 per season.
- Season slicing: solstice/equinox cuts (⚠ confirm vs. profection cuts — open question in parent plan §7 — before building).
- Merge mundane events: eclipses/lunations on natal-sensitive degrees; expose server-side (port the relevant slice of `getLunarCalendarRangeEvents` logic rather than calling the browser engine). Solar return inserted as a key date.
- Per-season headline aspect = highest-scoring slow transit.

**Done when:** endpoint returns a full seasoned bundle for fixture charts; sampled exact dates pass the Horizons integrity check (extend `scripts/verify-astrology-integrity.mjs`).

### Y3. Category mapping table

**Files**
- `packages/astro-knowledge/data/` — new `report-categories` dataset + build into `dist/`
- Consumed by `year_ahead.py`

**Work**
- Static lookup: (transiting planet, natal planet, natal house) → `WORK | SELF | SEX & LOVE | FRIENDS & FAMILY`. Deterministic, reviewable, no LLM judgment.

**Done when:** every possible hit in Y2 output maps to exactly one category; table reviewed by owner.

### Y4. Year Ahead generators (~25 units)

**Files**
- `api/_lib/content-generation.ts` — `yearAheadSystemPrompt()` + per-unit builders
- `api/generate-user-content.ts` — accept the three `year_ahead*` subject types
- `api/_lib/report-envelope.ts` — year-ahead assembly (facts from Y2 via server call, frozen into envelope)

**Work**
- `year_ahead` cover/closer: year theme title + "Looking ahead", grounded in profection Lord + dominant slow transit.
- `year_ahead_season` ×4–5: backstory paragraph (natal placements activated by headline transit) + forecast paragraph with directives; no planet names in prose.
- `year_ahead_key_date` ×~20: 2–3 sentences, category-toned.
- Same editorial gates and `needs_review` flow as R3.

**Done when:** full report generates for a fixture chart; all units pass coherence gates.

### Y5. Year Ahead UI

**Files**
- New: `apps/web/src/routes/YearAheadRoute.tsx` (thin shell, lazy)
- New: `apps/web/src/features/you/YearAheadReport.tsx`
- New: `apps/web/src/styles/year-ahead.css`
- Entry point on `features/you/YouPage.tsx`

**Work**
- Cover → season index → chapter view (ReportArticle blocks) → key-date bottom sheets (reuse personal-timing detail-sheet pattern) → colophon.
- Route `#/you/year-ahead`; keep `App.tsx` additions to route registration only.

**Done when:** full flow works with the fixture report; `qa:bundle` passes.

### Y6. Year Ahead review cycle

Same shape as R5 — note this is the largest copy-approval load (~25 units/report). Budget owner time accordingly.

---

## Phase H — Hardening

### H1. Regeneration policy

- Facts frozen per `(report_type, subject_id, period_start)`. Regenerate only on: birth-data edit (both parties for relationship), explicit owner action, or new solar-return period. Implement as envelope invalidation in `report-envelope.ts` + a check on birth-data mutation paths (`manualCharts.ts`, profile settings).

### H2. Content contract tests

- Extend `npm run test:content` with: attribution-line format contracts, no-planet-names-in-prose check on generated units, banned-phrase coverage for the diagnosing-others list, SOURCE_GAP behavior when facts lack a section's inputs.

### H3. Engine-drift monitor

- Script comparing server report facts vs. browser `chartMath.ts`/`ephemeris.ts` for sampled charts (orb-edge disagreements). Wire into the existing integrity workflow; alert, don't block.

### H4. QA + budgets

- `npm run qa:bundle`, route-level lazy-load verification, mobile-width pass on both report flows, reader-safety sweep on all shipped units.

---

## Dependency graph

```
F1 ─┬─ F2 ── R3 ── R5
    └─ F3 ─┬─ R1 ── R2 ── R4
           └─ Y4 ── Y6
F4 ── F5 ─┬─ R4
          └─ Y5
Y1 ── Y2 ─┬─ Y3
          └─ Y4 ── Y5
H* after R5/Y6
```

Critical path: F1 → F3 → R1 → R3 → R5 (relationship dogfood, ~week 3), then Y1 → Y2 → Y4 → Y6 (~week 7).

## Explicitly deferred

Paywall/entitlements (own plan), full solar-return chart + progressions (Y v2), auto-regeneration-as-repurchase (product decision), monthly horoscope (`HoroscopePeriod` vestige — unrelated).
