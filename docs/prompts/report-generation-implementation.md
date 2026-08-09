# Prompt: Report generation system (calculation layer + multi-horizon generator)

Copy everything below into a fresh Codex session. Prerequisites: PR #117 (Phase F foundation) and PR #118 (R1-R2) exist; branch off the most advanced of them (currently `codex/relationship-facts-r1-r2`).

---

Implement the personalized report generation system for TLDR Astro: the Year Ahead calculation layer and the single multi-horizon generator. The editorial specification phase is complete and owner-ruled; your job is engineering, not doctrine. You write no reader-facing prose anywhere in this task.

Sequencing: CLAUDE.md serving-content merge model v2 governs. This branch adds one new dataset under `packages/astro-knowledge/data/` (a scope path); keep that in its own commit and leave all `review_status: approved` rows byte-identical. Do not stop for open scope PRs.

## 0. Land the governing documents

These exist in the repo working tree (or owner will supply them); commit them first so the branch is self-describing:

- `tldr-astro-phrasebank/TLDR-REPORT-HORIZONS-GENERATION-PROMPT-OWNER.md` — the canonical generation prompt, one prompt with required `REPORT_HORIZON` in {1_month, 4_months, 6_months, 12_months}. This is the system-prompt source of truth.
- `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md` — the 27-point GENERATION STANDARD (12-month deep rules).
- `tldr-astro-phrasebank/TLDR-YEAR-AHEAD-MANIFESTATION-SETS-OWNER.md` — manifestation-set record format.
- `artifacts/marie-satori-year-ahead-2026-FINAL.md` — owner-authored final reference report (12_months); its text is owner_authored_final voice evidence.
- `artifacts/marie-satori-year-ahead-2026-manifestation-sets-v1.md` — worked manifestation sets for the reference chart.
- `artifacts/marie-satori-year-ahead-2026-candidate-v2-review.md` — the full v1→FINAL review record (history; do not modify).

Read all of them before writing code. The generator must load the canonical prompt document at build or runtime rather than embedding a paraphrase; paraphrasing the owner's ruling is a defect.

## 1. Calculation layer (FastAPI service)

Extend `services/tldrastro-api` (tasks Y1/Y2/S1 from `docs/premium-reports-task-breakdown.md`, updated by everything since):

1. **Full Solar Return chart** (`services/solar_return.py`): SR moment via Sun-to-natal-longitude bisection (reuse `_bisect_aspect_exact` machinery in `services/chart.py:405`), then the complete SR chart at a supplied location (default current residence, birthplace toggle; tropical, non-precessed; both whole-sign and quadrant houses per plan §3).
2. **`solar_return_analysis`**: SR-to-natal house overlays both directions, SR planets on SR and natal angles, SR↔natal aspects (~1° aspects, ≤6° planets-on-angles), lord-of-year condition at the SR (consume `services/profections.py`, do not recompute), profection/SR coincidence and governor checks, big-year score with named drivers.
3. **`POST /timing/report-window`**: generalization of the planned `/timing/year` for any [start, end] window (serves all four horizons). Returns: slow-transit hits (Jupiter–Pluto + Chiron to natal points/angles) with exact dates and full pass structures (count, per-pass dates, retrograde motion, station proximity to natal degrees within 1.5°); fast-transit key dates scored with profection-Lord bonus; eclipses and lunations with natal-contact flags; ingresses/stations when personally relevant; season boundaries (solstice/equinox) and calendar-year boundaries inside the window. `TransitHit.exactAt` must be real everywhere in this path.
4. Tests: SR fixtures for the Marie chart (SR 2026-02-18 01:59 UT, SR Venus 9°35' Pisces natal WS 10th, SR Asc 11°01' Libra natal 5th, next SR 2027-02-18 07:40 UT) plus Horizons-checked exact dates for the reference year's transits (Feb 22/26, Apr 14, May 1/14/19, Jul 4, Aug 27, Sep 27, Oct 4/6/9/20, Feb 5/10, eclipses Mar 3, Aug 12, Aug 28, Feb 6). These are all recorded in the FINAL report's attribution lines; treat those lines as the calculation contract.

## 2. Manifestation-sets dataset

New `packages/astro-knowledge/data/manifestation-sets/` (own commit): records keyed by factor type (eclipse-on-natal-point, slow-transit-to-natal, return, profection-year, SR-overlay) × house/planet domain, each carrying DOMAIN, POSSIBLE LIVED MANIFESTATIONS, DO NOT ASSUME, and one COPY CLAIM slot (status `needs_review`; the owner authors/approves copy claims, you seed structure only — you may import the DOMAIN/MANIFESTATIONS/DO-NOT-ASSUME lists from the owner's rulings verbatim, since those lists are owner-authored). Seed the records the reference chart exercises plus the per-house menus in the standard (4th, 6th, 10th) and the domain lists from the coverage gate. Build into dist like the other datasets.

## 3. Generator

Extend `api/generate-user-content.ts` + `api/_lib/content-generation.ts`:

- New subject type `report_unit` with `reportHorizon` in {1_month, 4_months, 6_months, 12_months}, envelope id (Phase F `user_reports`; add `report_type` values for the horizon reports via migration), and unit/section id derived from the horizon contract's architecture.
- Facts pipeline: envelope freezes the `/timing/report-window` (+ SR/profection for 12_months) bundle; each factor resolves to its manifestation-set record; the prompt payload contains the canonical owner prompt, the horizon parameter, the frozen facts, the resolved manifestation sets, and owner voice evidence retrieved per the skill's evidence rules (the FINAL report is now retrievable owner_authored_final for this surface).
- Dry-run mode returning the full assembled payload without provider calls; snapshot tests for one unit per horizon using the Marie fixture.
- **Post-generation validators** (mechanical, all tested): em dash; "whether"; astrologer-persona strings; DO-NOT-ASSUME assertions (excluded item stated as fact); possibility-language check with the hedged-frame scenario-block exception (declaratives permitted only when the immediately preceding sentence in the same block carries may/can/might framing); lexical budget (configurable signature-noun cap, default 3 per report, "application" seeded); menu-size cap; Saturn-return content present in a non-return year; empty domain sections (1_month contract); next-year events inside a current-year review section (12_months contract).
- All output lands `DRAFT`/`needs_review`. No promotion paths.

## 4. Constraints and gates

- No reader-facing prose authored in code, prompts, or fixtures (`FIXTURE_ONLY_*` placeholders).
- Protected paths: only the manifestation-sets commit touches `packages/astro-knowledge`; nothing touches `fallbackArchitectureV3`.
- Gates: web type-check, API esbuild, `npm run test:content`, Python suite + new fixtures, migration dry-run with rollback, dry-run snapshots, validator unit tests, `git diff --check`.

## 5. Verification and handoff

(1) Calculation contract: every attribution line in `marie-satori-year-ahead-2026-FINAL.md` is reproducible from the service output (dates within a day, houses exact, pass counts exact). (2) Dry-run payloads for all four horizons assemble with correct horizon contracts and no cross-horizon leakage (a 1_month payload contains no season architecture; a 12_months payload groups by season). (3) All validators demonstrably catch seeded violations. (4) Gates green. Finish with: files changed, the calculation-contract diff table, seeded manifestation-set records awaiting owner copy claims, and a draft PR titled "Report generation system: calculation layer + multi-horizon generator" with base per the merge queue. Note anything that changes the task-breakdown estimates.
