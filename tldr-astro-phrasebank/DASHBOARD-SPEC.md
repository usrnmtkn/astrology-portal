# Generated-Content Admin Dashboard — Rebuild Spec

For Codex to implement in `apps/web/src/admin/GeneratedContentAdminDashboard.tsx` (+ the admin
APIs). This is an information-architecture and review-UX rebuild, not a from-scratch backend.
Keep the existing APIs and Supabase schema; reorganize the surface and add the missing controls.

Source-of-truth files (do not paste; treat as authoritative):
`apps/web/src/admin/GeneratedContentAdminDashboard.tsx`, `api/admin/generated-content.ts`,
`api/admin/review-records.ts`, `api/admin/user-generated-content.ts`, `api/admin/prepopulate-content.ts`,
`api/admin/content-facts.ts`, `apps/web/src/content/fallbackHooks.ts`,
`apps/web/src/services/generatedContent.ts`.

## 1. Problems the rebuild solves
1. Old generated-content generation workflows sit beside the phrasebank review flow and confuse
   which is the source of truth. → Make the dashboard **phrasebank-first**.
2. Local `fallbackHooks.ts` placeholders render alongside saved rows and look like real content
   ("Local only" badge). → **Saved-first**: show saved rows by default, keep unseeded routes in a
   separate Hook Catalog, never mix local placeholders into the saved list.
3. Content classes (phrasebank content, fallback-hooks, vocab, reference, user-generated) are
   split but not clearly labeled. → One explicit **content-class** dimension shown everywhere.
4. No first-class authoring for fallback-hooks and vocab. → Add authoring views for both.
5. No bulk sign-off and no per-relationship-type composite visibility. → Add both.

## 2. Content classes (the primary filter, shown as a chip on every row)
Derive from `content_key` prefix / `block_type` / `prompt_version`:

| Class | Detection | Notes |
|---|---|---|
| **Phrasebank content** | canonical keys (`natal.*`, `composite.aspect.*`, `transit.aspect.*`, `sky.*`, `synastry.*`, …) | the real readings; primary serving layer |
| **Fallback-hook** | `content_key` starts `fallback-hook/`; `block_type=fallback_template`; `prompt_version=fallback-hook-template-v1` | route-level generic copy |
| **Vocab** | `content_key` starts `vocab/` or `fallback-vocab/`; `prompt_version` in {`vocab-v1`,`tagline-v1`} | building blocks for generation/taglines |
| **Reference** | flag `REFERENCE_ONLY_NEVER_SERVE_VERBATIM`, or Marie/CC quote/template libraries | never served verbatim |
| **Generated (legacy)** | `provider` set + no phrasebank key mapping | old model-generated drafts |
| **User-generated** | `user_generated_interpretations` table | private, per-subject |

## 3. Tiers (bundle provenance, shown as a badge)
`CONFIRMED` (Marie verbatim), `REVIEWED` (composed, awaiting sign-off), `SESSION_APPROVED_DRAFT`
(Claude-drafted, Marie-reviewed, dashboard confirmation pending). Carried on import from the bundle.

## 4. Information architecture (top-level tabs)
1. **Review Queue** — the default. Rows needing action, grouped by status. Filters: content class,
   tier, surface, mode, lane, review_state, block_type, free-text key. Bulk select + bulk actions.
2. **Phrasebank Content** — the readings, browsable by surface → key family → key. Shows the
   Marie sign-off checklist (from `CONSOLIDATION-MANIFEST.md`) with per-surface progress.
3. **Fallback Rows** — **saved-first**: only saved `fallback-hook/` rows from Supabase. Never render
   local placeholders here. Author / edit / publish. A visible "saved vs local" state per route.
4. **Hook Catalog** — every route the runtime can request (static list from `fallbackHooks.ts` +
   dynamic families `lunation/{phase}/{sign}`, `season-arc/{sign}[/ {phase}]`). For each: whether a
   saved row exists, and a one-click "author from template" that seeds a DRAFT saved row.
5. **Vocab** — the `vocab/*` and `fallback-vocab/*` namespaces (see §7), authored/edited with their
   structured `sections` shapes. Shows which namespaces are complete vs missing.
6. **Composite by type** — for each composite aspect, show the 7 relationship-type variants
   (`sections.byRelationshipType`) side by side, with the shared meaning; edit per type; enforce the
   romantic-gating rule (no romantic vocabulary in non-romantic variants).
7. **Users** — `user_generated_interpretations` (read-mostly, per-subject).

## 5. Review / publish lifecycle
Status flow: `DRAFT → REVIEWED → LIVE → ARCHIVED`; `ERROR` = needs attention.
- Import creates `DRAFT`.
- `REVIEWED` sets `reviewed_at`, clears `review_state`.
- `LIVE` sets `reviewed_at` + `published_at`, clears `review_state`.
- **Runtime serves only** `status=LIVE AND lane=serving AND review_state IS NULL AND not blocking-flagged`.
- `LIVE` rows are protected during bulk import/upsert and cannot be deleted (demote first).
- Admin API requires `Authorization: Bearer CONTENT_GENERATION_SECRET`.

Row actions: **Needs Review, Draft, Reviewed, Publish, Sign Off** (Sign Off = DRAFT/REVIEWED → LIVE
with `review_state=null`). Bulk versions of each for selected saved rows. Every publish/sign-off runs
the reader-safety checks (§6) and blocks on failure.

## 6. Reader-safety checks (block REVIEWED/LIVE on failure)
- Copy is non-empty in the serving field(s) for the row's mode.
- Copy does not look like metadata / reference text / a bare key.
- Row is not flagged `REFERENCE_ONLY_NEVER_SERVE_VERBATIM`, `PARAPHRASE_PENDING`, or `BLOCKLIST_MATCH`.
- (Optional, recommended) run the bundle's editorial lint (no em dashes, banned register, seams).

## 7. Fallback-hook & vocab shapes (authoring views must match these)
**Fallback-hook row** (`generated_interpretations`): `content_key=fallback-hook/{key}`,
`event_type=fallback-hook`, `block_type=fallback_template`, `prompt_version=fallback-hook-template-v1`,
`source_snapshot={contentType:"template", hook:"{key}"}`, copy in `headline` / `summary` / `body`,
`sections` usually `[]`. `surface`/`mode` per the registry. (Bundle ships 31 saved static rows in
`cc-fallback-hooks.json`; dynamic `lunation/*` and `season-arc/*` families already exist in-repo.)

**Vocab rows** (`prompt_version=vocab-v1` unless noted; serve at LIVE/serving/review_state=null):
- `fallback-vocab/planet-topic/{planet}` → `sections.topic.{you,friend,natal,sky}` + `body`
- `fallback-vocab/sign-style/{sign}` → `sections.style.{phrase,short}` + `body`
- `fallback-vocab/sign-need/{sign}` → `sections.need.{phrase,natal,sky}` + `body`
- `vocab/natal-card-tagline/{point}` → `sections.tagline.natal` or `body` (`prompt_version=tagline-v1`)
- `vocab/relationship-context/{romantic,friendship,family,coworkers,creative,exes,complicated}`
- career family: `vocab/house-career/{house}`, `vocab/house-cusp-element/{element}`,
  `vocab/element-career/{element}`, `vocab/mode-career/{mode}`, `vocab/hemisphere/{hemisphere}`,
  `vocab/mc-element/{element}`, `vocab/planet-in-10th/{planet}`, `vocab/saturn-mastery/saturn`,
  `vocab/north-node-mode/{mode}`
Note: `vocab/ruling-planet-advice/{sign}` (bundle batches 1–4) has no runtime consumer yet; park until wired.

## 8. Import behavior (existing importer, `prepare-tldr-astro-store-import.mjs`)
Additive, DRAFT, on-conflict-protect LIVE. Tier → columns: CONFIRMED → serving/DRAFT (no reference
flag); REVIEWED and SESSION_APPROVED_DRAFT → DRAFT + `review_state` set + EDITORIAL_REVIEW_REQUIRED.
Reference/support files excluded row-by-row. Nothing serves until an admin signs off.

## 9. Keep vs rebuild
Keep: the admin APIs, the Supabase schema + RLS, the importer, the generation endpoint. Rebuild: the
dashboard IA (tabs above), the saved-first fallback view + Hook Catalog, the content-class + tier
chips, bulk sign-off, the vocab authoring views, and the composite-by-type view. Retire from the main
review flow: ad-hoc model-generation actions that compete with phrasebank review (move them to a
clearly labeled "Generate (legacy)" corner or behind a flag).
