# Prompt: Land transit work, then build the report foundation (Phase F)

Copy everything below into a fresh coding session.

---

Two jobs, in order: land the finished transit branch, then build the shared premium-report foundation. Read `docs/premium-reports-task-breakdown.md` (Phase F) and `docs/premium-reports-implementation-plan.md` (§3) first. Honor the CLAUDE.md flight rule: before creating any branch, list open PRs touching `fallbackArchitectureV3` or `packages/astro-knowledge`; if any exists, stop and report.

## Job 1: Open the transit PR

Commit `158702a0` on `fix/reader-variant-grammar-v2-provenance` contains the transit direction fixes, natal multi-pass engine, pass-aware keys, return eligibility gate, and station-on-natal ranking. Open a PR to `main` titled "Transit direction fixes + natal multi-pass engine". In the description list: the bug fixes (direction population, signed-speed exact dates, retrograde-aware windows, LIVE you_transit rendering, server exactAt), the pass engine, the return allowlist (sun through saturn, chiron, uranus, north-node; neptune/pluto excluded by owner decision), and the outstanding SOURCE_GAP keys (`authored/transit-return/sun`, `authored/transit-return/uranus`, `fallback-hook/transit-pass/1..3`) noting that copy candidates await owner approval in `tldr-astro-phrasebank/TLDR-Transit-Return-Pass-Candidates-REVIEW.md`. Do not write or wire any reader copy.

## Job 2: Phase F — shared report foundation

Build on a new branch off `main` (after the flight-rule check). This is infrastructure only: no report content, no generators, no prompts. Tasks F1–F5 from `docs/premium-reports-task-breakdown.md`:

### F1. Migration: report mode + surfaces

New migration in `apps/web/supabase/migrations/` (follow the existing `YYYYMMDDHHMMSS_name.sql` convention):
- Extend the `mode` CHECK constraints on `generated_interpretations` and `user_generated_interpretations` to `('feed','in_depth','article','report')`.
- Extend the `surface` CHECK on both tables with `year_ahead`.
- Leave RLS untouched. Must apply cleanly against a shadow DB with existing rows.

### F2. Subject types + provider routing

- Add `"year_ahead" | "year_ahead_season" | "year_ahead_key_date" | "year_ahead_sr_moment" | "year_ahead_sr_stance" | "year_ahead_sr_sun" | "year_ahead_headline" | "year_ahead_saturn_return_callout" | "relationship_report_section" | "saturn_return" | "saturn_return_section"` to the subject-type unions in `api/generate-user-content.ts` (~line 12) and `apps/web/src/services/userGeneratedContent.ts` (~line 4). The two unions are currently duplicated; extract them to one shared type if there is a clean home for it, otherwise keep them identical and add a comment cross-referencing the twin.
- In `api/_lib/provider-config.ts`, route `relationship_report_section` to `CONTENT_GENERATION_PROVIDER_RELATIONSHIP`; the rest use the default provider.

### F3. Report envelope

- New migration: table `user_reports` with `id`, `user_id`, `report_type` (`year_ahead|relationship|saturn_return`), `subject_id` (nullable), `period_start`, `period_end`, `facts jsonb`, `facts_engine` text, `status` (`draft|needs_review|approved|live`), timestamps. Unique on `(user_id, report_type, subject_id, period_start)`. RLS: owner select; service-role insert/update. Browser must not be able to write.
- New `api/_lib/report-envelope.ts`: create/fetch a report row, freeze facts (write-once: reject facts mutation on an existing row unless an explicit `regenerate` flag is passed), and list child units from `user_generated_interpretations` by `content_key` prefix `report:{report_id}:`.
- Script test `scripts/test-report-envelope.mjs` in the style of `scripts/test-pair-daily.mjs`: round-trip a report with frozen facts and two fake units; assert facts immutability and unit listing.

### F4. Attribution renderer

- New `apps/web/src/components/reports/attributionFormat.ts` + `AttributionLine.tsx`.
- Pure formatter from a facts record to strings like: "During this season, Uranus squares your natal Mercury." / "At this time, Mercury is conjunct your natal Mercury." / "Your Solar Return Sun falls in your natal 4th house." / "Saturn is exact on your natal Saturn on May 3, 2027, the second of three passes."
- Verb forms for conjunct/sextile/square/trine/opposite; glyphs via `components/charts/chartAssets.ts`; ordinal house names; no em dashes anywhere in output. Every output must pass `isReaderFacingCopy` (`apps/web/src/content/readerSafety.ts`). These strings are deterministic fact renderings, not generated prose, so they do not go through the editorial review pipeline, but keep wording to the fixed patterns above.
- Unit tests covering every aspect verb, both directions (transit-to-natal, SR-to-natal), pass-series suffixes, and house ordinals 1st–12th.

### F5. Report article renderer

- New `apps/web/src/components/reports/ReportArticle.tsx` + `apps/web/src/styles/report-article.css`.
- Generalize the section pattern from `apps/web/src/features/sky/SkyDetailArticle.tsx` (kicker/title/meta/sections/key-dates/sourceTag) into a report-agnostic renderer: cover block, chapter blocks (image slot, kicker, title, paragraphs, AttributionLine), key-date list with bottom-sheet detail (reuse the existing sheet pattern), colophon.
- Tokens only per `docs/design-tokens.md`; add tokens to `styles/theme.css` if needed, never one-off shadows. Newsreader for display, Geist Mono for labels/attributions.
- Render a fixture report JSON end-to-end behind a dev-only route or harness; no production route yet.

## Constraints

- No reader-facing prose authored in this task anywhere. Fixtures may use obvious placeholder text that `readerSafety` would flag as non-shippable.
- `App.tsx` is 18k lines: touch it only for wiring, if at all.
- Gates: web type-check + tests, `npm run test:content`, `npm run qa:bundle`, migration dry-run. Run `git diff --check`.

## Verification

(1) Shadow-DB migration applies and rolls forward on existing data; (2) envelope script test passes including the facts-freeze rejection; (3) attribution unit tests green; (4) fixture report renders all block types at mobile width; (5) all gates green. Finish with a summary listing anything discovered that changes `docs/premium-reports-task-breakdown.md` estimates, so the doc can be updated.
