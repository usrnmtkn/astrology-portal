# TLDR Astro — Handoff for Codex

This bundle is the reviewed content system for a CC-style astrology app written in Marie
Satori's voice. It is a Python **phrasebank + composers + validation-harness** repo. Everything
below is buildable and green as of handoff.

## 1. How to build & validate

```bash
# from the repo root
BASE=/path/to/tldr-astro-template-handoff-v2         # source corpus (marie-source-phrases.json, MADLIBS, sources/)
export MS_PATH="$BASE/sources/marie-source-phrases.json"
export MADLIBS="$BASE/TLDR-ASTRO-MUSTACHE-MADLIBS-v2.2.md"
export SRC_DIR="$BASE/sources"
bash tests/build_all.sh
```

`build_all.sh` rebuilds every phrasebank JSON, runs all render harnesses, `validate.py`, and
regenerates `CONSOLIDATION-MANIFEST.md`. Green state at handoff:

- `RESULT: 2216/2216 rendered clauses valid`
- all surface harnesses pass (sky, lunation, natal, transit-house, transit-activation, gap-surfaces, composite-typed)
- `17/17 checks passed`

Individual harnesses (no source corpus needed) can be run directly, e.g.
`python3 tests/render_composite_typed.py`.

## 2. Content tiers (provenance)

| Tier | Meaning | Serving rule |
|---|---|---|
| **CONFIRMED** | Marie's own words (verbatim) | Serve as-is. Never tone-passed or re-linted. |
| **REVIEWED** | Composed/authored in her voice + rules | **Awaiting Marie sign-off** before serving. |
| **SESSION_APPROVED_DRAFT** | Claude-drafted, Marie-reviewed (e.g. Aesop-Rock-paraphrased ruling-planet advice batches 3–4) | DRAFT; confirm in dashboard before serving. |

Filenames containing `reviewed` go through the tone/seam/register pipeline; files without it
(the CONFIRMED and DRAFT verbatim banks) are intentionally skipped so their exact wording is kept.

## 3. Surface inventory

`CONSOLIDATION-MANIFEST.md` is generated from ground truth (`tests/consolidate.py`) and is the
source of record for counts, tiers, harness status, and the Marie sign-off checklist. Summary of
surfaces: natal placements + aspects + chart patterns; three transit layers (planetary horoscope,
long-term house transit, dated aspect activation); collective Sky + historical lookback;
relationships (synastry + composite). See the manifest for exact per-surface counts.

## 4. Editorial rules enforced by the harnesses

- **No em dashes.** No deterministic language ("will definitely", "forces you to", "destined").
- **Seam filter** (`resolver/seam_filter.py`): bans keyword seams ("X brings", "X meets Y",
  "moves through … circumstances/topics", bare comma-run lists) and a banned register
  (shrink, take up space, hold space, alignment, authentic self, masks, highest self).
- **Personalized voice** required (`you` / `your` present).
- **Full-form voice** in the natal/composite aspect surfaces (no contractions) — matches Marie's style.
- Provenance: every composed record carries `sourceKeys` (all `cc/` or `ms/`).

## 5. NEW this session — the relationship-type-aware composite system (IN PROGRESS)

This is the active work and the thing to continue tomorrow.

### Architecture (`resolver/composite_typed.py`)
A composite aspect reading is split into two layers:

1. **Meaning layer — shared, auto-generated, complete for all 45 pairs × 5 aspects.**
   `meaning(pair, aspect)` composes `PLANET_MEANING[a]` + `PLANET_MEANING[b]` + `ASPECT_MEANING`
   in the author's colon format, e.g.:
   *"Composite Saturn: the relationship's commitment, structure, and limits. Composite Sun: the
   relationship's identity, direction, and purpose. Square: these two parts can be difficult to
   satisfy at the same time."*
   The astrology is identical for every relationship type.

2. **Lived layer — per relationship type, hand-authored.**
   `LIVED[pair][valence][type] = {experience, advice}`. The astrology does not change; only the
   lived conflict and the advice do.

Rendered reading = `[experience, advice, "The astro: your composite {A} {verb}s your composite {B}."]`.
The `meaning` is metadata (an explainer the app can show); the body is experience + advice + footer.

### The 7 relationship types (`TYPES` / `LABELS`)
`romantic, friendship, family, coworkers, creative, exes, complicated`
→ Romantic, Friendship, Family, Coworkers or business partners, Creative collaborators, Exes, It's complicated.

### Hard rules (enforced by `tests/render_composite_typed.py`)
- **Romantic-gating:** romantic vocabulary (`ROMANTIC_LEX`: "as a couple", "shared future",
  "staying close", "romance/romantic", "lover", "dating", "in love", "sweetheart") may appear
  **only** in the `romantic` type. The harness fails any non-romantic cell that leaks it.
- **Exes** read in **past tense**, retrospective, and non-wallowing (understand the pattern, carry
  the lesson not the blame).
- All standard editorial rules (dash/seam/register/personalized) apply.
- Valence buckets: conjunction→`fused`, square/opposition→`friction`, trine/sextile→`flowing`.
  Astronomical constraints from `natal_aspect.py` also apply to composite inner-planet pairs.

### Status: 6 of 45 pairs authored (112 lived cells), all passing
Authored: `moon-sun, saturn-sun, mars-venus, moon-venus, sun-venus, saturn-venus`.
Emitted to `phrasebank/cc-composite-typed.json` (tier REVIEWED).
The single-voice composite bank (`cc-composite-aspect.json`, 225 records) is kept as **fallback**
for pairs/types not yet authored, so nothing renders blank.

### To continue the rollout (tomorrow)
Author the remaining **39 pairs** into `LIVED`, following the approved pattern, in this order of value:
1. Remaining Venus pairs: `mercury-venus` (fused+flowing only), `jupiter-venus`, `uranus-venus`, `neptune-venus`, `pluto-venus`.
2. Mars pairs: `mars-sun` (done as saturn? no — author), `mars-moon`, `mars-mercury`, `mars-jupiter`, `mars-saturn`, `mars-uranus`, `mars-neptune`, `mars-pluto`.
3. Remaining luminary + mercury pairs, then Jupiter/Saturn social pairs.
4. Generational outer-outer pairs last (they read as background; keep short).
Each pair = up to 3 valence buckets × 7 types. Run `python3 tests/render_composite_typed.py`
after each pair; fix any `not personalized` (add an explicit `you`/`your`) or `register:`/romantic
-gating flags before moving on. Then `bash tests/build_all.sh` to re-emit JSON + refresh the manifest.

## 6. Key files

- `resolver/` — composers: `composite_typed.py` (NEW, in progress), `composite_aspect.py`,
  `natal_aspect.py`, `synastry_overlay.py`, `planetary_horoscope.py`, `transit_house.py`,
  `transit_activation.py`, `sky_collective.py`, `empty_house.py`, `natal_retrograde.py`,
  `seam_filter.py`, `admin_settings.py`.
- `tests/build_*.py` — builders that emit `phrasebank/*.json`. `tests/render_*.py` — harnesses.
  `tests/build_all.sh` — orchestrator. `tests/consolidate.py` — manifest generator.
- `phrasebank/*.json` — the reviewed content banks.
- `CONSOLIDATION-MANIFEST.md` — generated inventory + Marie sign-off checklist.
- `config/admin-content-settings.json` — admin toggles (e.g. `skyHistoricalLookbackEnabled`).

## 8. App integration (tldrastro monorepo)

Target repo: `/Users/mprez/code/tldrastro` (React 19 + Vite web app, Supabase, Vercel API,
FastAPI calc service, `packages/astro-knowledge`). The definitive runtime/key/schema reference is
`scripts/generated/tldr-astro-codex-mapping-handoff.md` in that repo — read it first.

**This bundle is source content, not app code. Integration means IMPORT + EXTEND, never REPLACE.**
Do not overwrite existing `LIVE` rows, and do not rewrite the fallback-hook or vocab systems
wholesale — extend them.

### 8a. Where content goes
All reader-facing copy imports into Supabase `public.generated_interpretations` (global/admin),
via the existing importer pattern `scripts/prepare-tldr-astro-store-import.mjs`
(`on conflict (content_key, target_date, mode) do nothing`, existing `LIVE` rows protected). The
admin surface is the in-app React dashboard `apps/web/src/admin/GeneratedContentAdminDashboard.tsx`
(writes via `api/admin/generated-content.ts` with the service-role key). Do NOT invent a new CMS.

### 8b. Key mapping — phrasebank id → runtime `content_key`
Runtime keys are canonical dot-form (see `apps/web/src/services/generatedContentKeys.ts`); legacy
hyphen aliases also resolve via `generatedContentAliases()`. Map on import:

| Phrasebank bank | runtime `content_key` | surface | block_type |
|---|---|---|---|
| `cc-planet-in-sign` | `natal.sign.{planet}.{sign}` | natal | sign |
| `cc-planet-in-house` | `natal.house.{planet}.house_{house}` | natal | house |
| `cc-natal-angle` | `natal.placement.{planet}.{sign}.house_{house}` | natal | house |
| `cc-natal-aspect` | `natal.aspect.{A}.{aspect}.{B}` (canonical order) | natal | natal_aspect |
| `cc-aspect-pair-*` (transit) | `transit.aspect.{transiting}.{aspect}.{natal}` | you | transit_to_natal_aspect |
| `cc-transit-house` | new family, e.g. `transit.house.{body}.house_{h}` | you | transit_to_natal_aspect |
| `cc-planetary-horoscope` | new family, e.g. `sky.planetary.{planet}.house_{h}` (by rising) | sky | sky_article |
| `cc-sky-*`, `sky-historical` | `sky.aspect.*`, `sky.ingress.*`, lunar keys | sky | sky_aspect / lunar_calendar |
| `cc-synastry-reviewed` | `synastry.aspect.{A}.{aspect}.{B}` (directional, NOT canonicalized) | synastry | synastry_aspect |
| `cc-synastry-overlay-full` | `synastry-{point}-house-{house}` alias family | synastry | synastry_aspect |
| `cc-composite-reviewed` | `composite.aspect.*` / `composite-{point}-in-{sign}` | composite | composite_aspect |
| `cc-composite-aspect` (single-voice) | `composite.aspect.{A}.{aspect}.{B}` | composite | composite_aspect |
| `cc-composite-typed` (7-type) | `composite.aspect.{A}.{aspect}.{B}` + relationshipType (see 8d) | composite | composite_aspect |
| `cc-ruling-planet-advice` / `-drafts` (`vocab/...` keys) | `natal.ruler.{ruler}` or a `vocab.ruling-planet-advice.{sign}` family | natal | ruler |

Body columns per reading. **Use the explicit named fields on each record; do NOT split the
`paragraphs` list by position** — its length varies (generational cells insert a `note` paragraph).
Every aspect record now carries: `experience`, `guidance`, `note` (nullable), `astro`, and (typed
composite) `meaning`. Map: `headline` = title, `summary` = `meaning`, `body` = `experience`,
`sections` = `{ guidance, note, astro, meaning }` (+ `byRelationshipType` for composite),
`facts` = `{ pair, aspect, valence, relationshipType, generational }`,
`source_snapshot` = `trace.sourceKeys`. (`paragraphs` remains as a pre-assembled convenience.)

### 8c. Tier → serving columns (CRITICAL — controls what serves)
Reader/RLS predicate is `status='LIVE' AND lane='serving' AND review_state IS NULL AND not flagged`.
Map this bundle's tiers onto those columns so nothing serves before human sign-off:

| Bundle tier | status | lane | review_state | flags |
|---|---|---|---|---|
| CONFIRMED (`ms-*`, `marie-confirmed`) | DRAFT → admin flips to LIVE | serving | null on sign-off | none (serve-verbatim; do NOT flag REFERENCE) |
| REVIEWED (`cc-*` composed) | DRAFT | serving | set non-null until sign-off | EDITORIAL_REVIEW_REQUIRED |
| SESSION_APPROVED_DRAFT (advice batches 3–4) | DRAFT | serving | set non-null | EDITORIAL_REVIEW_REQUIRED + a draft flag |

IMPORTANT correction to the earlier dry-run: this bundle is **finished composed copy in Marie's
voice**, not raw source excerpts. Do NOT auto-tag these `cc-*` banks
`REFERENCE_ONLY_NEVER_SERVE_VERBATIM`. They are serving-eligible after sign-off; only true source
snippets get the reference-only flag.

### 8d. NEW app work required — the composite `relationshipType` dimension
The app's `composite.aspect.{A}.{aspect}.{B}` key has **no relationship-type dimension**, but the
type-aware system produces 7 variants per aspect. Recommended (matches the one-meaning /
swap-lived-layer architecture and the existing `sections jsonb` column):
- Store ONE row per composite aspect. Put the shared `meaning` in `summary`, and the 7 type
  variants in `sections.byRelationshipType = { romantic:{experience,advice}, friendship:{...}, ... }`.
- At render, select the variant by the chart's `manual_charts.relationship_type`. Fall back to
  `cc-composite-aspect.json` (single-voice) for pairs/types not yet authored (only 6/45 pairs done).
- Reconcile the type vocab: `manual_charts.relationship_type` currently defaults to `'friend'`;
  extend its allowed values + the Friends UI to the 7 types (`romantic, friendship, family,
  coworkers, creative, exes, complicated`). This is a product/schema change to confirm with the owner.
- Enforce romantic-gating at render: never show a romantic variant for a non-romantic type.

### 8e. Admin dashboard changes
Extend `GeneratedContentAdminDashboard.tsx` to (1) show the bundle tier + sign-off state per row and
a control to flip REVIEWED/DRAFT → LIVE (sets `review_state=null`, `status=LIVE`), (2) render the
Marie sign-off checklist from `CONSOLIDATION-MANIFEST.md`, (3) for composite rows, show/edit the
per-relationshipType variants. Respect `config/admin-content-settings.json` toggles.

### 8f. Do NOT do
Do not overwrite existing `LIVE` rows, delete fallback-hook rows, replace `packages/astro-knowledge`,
or serve any imported row without the sign-off flip. Produce a dry-run diff/report (like the existing
`scripts/generated/tldr-astro-store-import-report.md`) and a PR for review before executing.

## 8g. Fallback-hooks, vocab, and the dashboard (new)
- `cc-fallback-hooks.json` (31 rows): saved `fallback-hook/{route}` rows as **slot templates**
  (`{{planet}}`, `{{sign}}`, `{{planetTopic}}`, `{{signStyle}}`, `{{aspect}}`, `{{moonSign}}`,
  `{{houseTopic}}`, `{{personA}}`, …), in the admin-API shape (`event_type=fallback-hook`,
  `block_type=fallback_template`, `prompt_version=fallback-hook-template-v1`). These replace the
  local `fallbackHooks.ts` placeholders. Import as DRAFT, sign over the legacy LIVE rows.
- `cc-vocab.json` (58 rows): `fallback-vocab/planet-topic/{planet}` (`sections.topic.{you,friend,natal,sky}`),
  `fallback-vocab/sign-style/{sign}` (`sections.style.{phrase,short}`), `fallback-vocab/sign-need/{sign}`
  (`sections.need.{phrase,natal,sky}`), `vocab/natal-card-tagline/{point}` (`tagline-v1`,
  `sections.tagline.natal`), `vocab/relationship-context/{7 types}`. Hook slots like `{{planetTopic}}`
  resolve from these. Confirm surface/`block_type` and the `relationship-context` section keys against
  the consumers (`planetTopicVocabulary.ts`, `natalPlacementTaglines.ts`, `relationshipContext.ts`).
  Career vocab family (`house-career`, `element-career`, …) is held pending owner confirmation.
- `DASHBOARD-SPEC.md`: the phrasebank-first admin rebuild spec (content-class + tier chips, saved-first
  Fallback Rows + Hook Catalog, bulk sign-off, vocab authoring, composite-by-type). Codex implements
  in-repo. Note: the Fallback Rows Edit/View actions currently do not work — wire them to the admin API.

## 7. Open items / not started
- Type-aware composite rollout: 39/45 pairs remaining (section 5).
- **Synastry** type-awareness: the same 7-type treatment has not been applied to synastry yet.
- By-sign **lunation** depth (only a few lunations captured verbatim).
- Chart patterns beyond stelliums; the Friends social surface.
- Everything REVIEWED still needs Marie's sign-off (see manifest checklist).
