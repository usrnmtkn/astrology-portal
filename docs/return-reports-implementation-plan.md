# Return Reports Implementation Plan: Solar Return + Saturn Return

**Status:** Draft
**Last updated:** 2026-08-07
**Parent plans:** [premium-reports-implementation-plan.md](./premium-reports-implementation-plan.md), [premium-reports-task-breakdown.md](./premium-reports-task-breakdown.md)
**Source doctrine:** distilled from the owner's reference library in `~/Downloads/Resources` (see §2). Doctrine is paraphrased; shipped copy must be original per the editorial regime — book text may seed internal reference docs and prompt context, never reader-facing output.

## 1. Product shape (recommendation)

- **Solar Return** is not a standalone product. It becomes the **calculation and interpretation deepening of the Year Ahead report** (parent plan §4), which already anchors on the solar-return-to-solar-return window and profections. Doctrine strongly supports this merge: the traditional sources treat profections and the solar return as one combined technique, with the SR as "the weather report on the profection's promise."
- **Saturn Return** is a **separate report, sold and surfaced as an add-on** — but it is only *highlighted* to people whose return is active or approaching. During Year Ahead fact assembly, the Saturn-return scan runs against the report window; if the return overlaps, the Year Ahead gains a short **"This is your Saturn return year"** callout chapter (timeline facts + pass dates threaded into the season key-date lists) that points to the full Saturn Return report as the add-on. Outside a return year, nothing is shown (or a one-line countdown in the colophon). This keeps the once-per-29-years deep-dive as its own purchasable product without burying it, and without padding every Year Ahead with Saturn content.

## 2. Sources and their roles

| Source | Status | Role |
|---|---|---|
| Dykes, *Persian Nativities IV* (Abu Ma'shar, revolutions) | read | SR doctrine core: profection+SR integration, lord of the year at the return, reading hierarchy, monthly layer |
| Estadella, *Predictive Astrology* | read | Modern SR doctrine: house overlays, SR-to-natal aspects (SRA, ~1° orbs), planets-on-angles, big-year cases |
| Kent, *Astrological Transits* | read | Annual-planner layer: Sun over natal angles, eclipses, retrograde windows |
| Jacobs, *Saturn Returns: Thinking Astrologically* | read | Saturn core: multi-pass doctrine, house/aspect axes, cycle checkpoints, second return, tone |
| Schostak/Weiss, *Surviving Saturn's Return* | read | Saturn sign chapters (12), survival-skills format, accessible register |
| Greene/Hand, *Saturn: A New Look at an Old Devil* | partial (scanned PDF) | Depth-psychology frame; tonal gold standard; element layer |
| Tierney, *Twelve Faces of Saturn* | read (full OCR) | Natal Saturn house essays (strongest house source), sign essays, guardian-angel reframe, Three Saturn Types, collapse→rebuild arc. **Not** a technical source: no orbs, no retrograde/multi-pass, transit-houses deliberately excluded |
| Braha; Silva; Dumont | read / skimmed | Excluded (Braha has no SR coverage) or minor confirmation only |

Distilled doctrine reference docs (task RD1 below) should live alongside the phrasebank (`tldr-astro-phrasebank/`) in the style of the existing `*-LIVED-REFERENCE.md` files.

## 3. Calculation decisions (settled by the sources)

1. **SR moment:** transiting Sun at exact natal Sun longitude, tropical, non-precessed (unanimous traditional stance; Estadella's precessed variant deferred to a power-user setting, likely never).
2. **Location:** the live doctrinal split is birthplace (Dykes) vs. current residence (Estadella). Default **current residence** (the app already stores `currentLocationData`), with a birthplace toggle. No relocation-shopping feature.
3. **Houses:** whole-sign for the profection/traditional layer (matches `profections.py`), quadrant for the modern overlay layer — mirror whatever the natal chart surface already renders to avoid a third convention.
4. **Reading hierarchy** (synthesized, both detailed sources agree): profection sign + lord of the year → SR Ascendant + its natal-house overlay → SR Sun's house → planets on SR angles → SR-to-natal contacts (conj/opp first, ~1° for aspects, up to 6° planets-on-angles) → SR-internal aspects last.
5. **Saturn return window:** define by ephemeris events, not fixed ages — scan for transiting-Saturn-conjunct-natal-Saturn exact hits plus stations near the natal degree. 1–3 exact passes; each pass classified (single / pass+station-Rx / pass+station-direct / three-pass awareness→review→action, per Jacobs). "Hot zone" onset when Saturn enters the natal Saturn sign.
6. **Big-year score (SR):** weighted rubric — profection×SR coincidence (SR Asc on sign of the year / lord of the year's sign / natal Asc sign) > natal planet's sign rising in the SR > planets on SR angles (≤6°) > tight SR↔natal contacts (≤1°) > planet repeating its natal house. Deterministic, computed server-side, surfaced as the report's headline driver list.

## 4. Solar Return — plan (extends Year Ahead)

### 4.1 Calculation (upgrades task Y1/Y2 in the parent breakdown)

- **Y1 upgrade:** `services/tldrastro-api/.../services/solar_return.py` computes the full SR chart (not just the timestamp): SR planets, SR Asc/MC, SR houses (both schemes), for a given location.
- **New `solar_return_analysis`:** SR-natal house overlays (both directions), SR planets on SR angles and natal angles, SR↔natal aspects (SRA orbs), lord-of-year condition in the SR (consumes `profections.py` output), coincidence/governor checks, big-year score with named drivers.
- **Monthly rhythm engine (optional v1.5):** doctrine supports a month-by-month layer via monthly profections from natal + SR Asc, or the SR Ascendant directed ~1 sign/month. This can replace or refine the parent plan's season-slicing open question — **recommendation: keep astronomical seasons for chapter structure (Co-Star familiarity), use monthly profections to select each season's key dates.** This resolves the parent plan §7 open question.

### 4.2 New/changed Year Ahead content units

Added to the Y4 generator set (subject types under the existing `year_ahead*` family):

- `year_ahead_sr_moment` — cover addition: SR date/time/place, "what a solar return is" explainer.
- `year_ahead_sr_stance` — SR Ascendant: sign as the year's approach + **"SR Ascendant in your natal Nth house"** (12-entry doctrine table from Abu Ma'shar VI.3 / Estadella step 1). This becomes the report's second chapter, before the seasons.
- `year_ahead_sr_sun` — SR Sun's house: where vitality and recognition concentrate (12-entry table, Abu Ma'shar II.15/V.5).
- `year_ahead_headline` — big-year score with top 2–3 drivers, attribution-line style ("This year, your Solar Return Ascendant falls in your natal 10th house").
- Season chapters (existing `year_ahead_season`) gain SR-derived facts in their bundles: lord-of-year condition, angular SR planets active that season.
- Attribution renderer (task F4) gains SR formats: "In your Solar Return chart, Venus rises" / "Your Solar Return Sun falls in your natal 4th house."

### 4.3 Doctrine tables → knowledge package

Two new authored datasets in `packages/astro-knowledge/data/` (like Y3's category table): `sr-asc-natal-house` (12 rows) and `sr-sun-house` (12 rows), each 1–2 line themes distilled from the digests, owner-reviewed. These ground prompts and drive SOURCE_GAP behavior when facts are incomplete (e.g., unknown birth time ⇒ no SR Asc ⇒ omit stance chapter, per Fallback V3 rules).

## 5. Saturn Return — plan (standalone add-on report + Year Ahead callout)

### 5.1 Calculation

New `services/tldrastro-api/.../services/saturn_return.py` + endpoint `POST /timing/saturn-return`:

- Scan ±2 years around each return age for exact Saturn-conjunct-natal-Saturn hits (reuse `_bisect_aspect_exact`), stations within orb of the natal degree, and sign-ingress into the natal Saturn sign (hot-zone onset).
- Classify pass structure per Jacobs: 1-hit / 2-hit-A (station-Rx) / 2-hit-B (station-direct) / 3-hit, with per-pass role labels (awareness / review / action).
- Return which cycle this is (first ~29.5 / second ~58-59 / third) and the next cycle checkpoints (waxing square ~+7y, opposition ~+14y) as forward hooks.
- Companion timing: progressed lunar return window preceding the Saturn return (Jacobs's setup beat) — progressed Moon conjunct natal Moon; simple secondary-progression Moon calc (the only progression math needed; scoped to the Moon).
- Report facts bundle: natal Saturn (house, sign, aspects, Rx flag), pass timeline, cycle context.
- **Highlight rule:** the add-on is promoted when any exact pass, station within orb, or hot-zone onset (Saturn entering the natal Saturn sign) falls inside — or within ~18 months after — the Year Ahead window / current date.

### 5.2 Standalone report content model

New subject types `saturn_return`, `saturn_return_section`. Sections (grounding per digest):

1. **Saturn comes home** — what a Saturn return is, anti-doom reframe (Greene).
2. **Your timeline** — hot zone, exact passes with per-pass meaning (awareness / review / action), progressed-lunar-return prelude. Key-dates list with attributions ("Saturn is exact on your natal Saturn on May 3, 2027 — the second of three passes").
3. **Where the pressure lands** — natal Saturn house (12-row doctrine table; **Tierney primary** — his house essays plus the doctrinal bridge that the natal Saturn house names the chronically unfulfilling area the return can finally resolve; Jacobs and Greene as depth layers). Core personalized chapter, backstory-then-demand paragraph pair (same template as Year Ahead seasons).
4. **How the lesson speaks** — natal Saturn sign (12-row table; Schostak chapters + Tierney sign essays — his "your dislike of the sign's traits measures the work" angle is a strong prompt device; Jacobs corroboration).
5. **Who's in the room** — natal aspects to Saturn, short modifier paragraphs per aspecting planet, incl. Saturn-Rx note (Jacobs).
6. **Collapse → demand → build** — the arc chapter (Schostak collapse imagery, Jacobs choice framework, Greene frustration-to-consciousness).
7. **The next 29 years** — waxing square / opposition checkpoints as forward hook (Jacobs cycle doctrine).
8. **Survival kit** — 3–5 concrete practices tailored to house+sign (Schostak style, Jacobs reflective questions), plus a **"Which Saturn are you?" sidebar** (Tierney's self-inhibitor / over-achiever / moderate diagnostic).

Section-grounding updates from Tierney: section 1 gains his guardian-angel/"limits protect" reframe (best anti-doom source in the corpus); section 6 gains his terminator→clarity→consolidation arc; section 7 gains squares/opposition as "correctional periods" and sextiles/trines as consolidation windows. Timeline (section 2) keeps Jacobs for pass structure — Tierney has no orb or retrograde doctrine. A "where Saturn is transiting now" house layer remains unsourced (Tierney excludes it by design); if wanted later, ground it in Hand's *Planets in Transit* (in Resources) as a v2 add.

Second-return variant (~58–59): same structure, sections 3–4 lens shifted from "become your own authority" to "offer your authority back" (elder framing), plus mortality-scripts reflective questions (Jacobs). Variant selected by cycle number in facts.

### 5.3 Year Ahead callout (the highlight surface)

New subject type `year_ahead_saturn_return_callout` — one short unit, generated only when the highlight rule fires:

- Placement: between the SR stance chapter and the seasons; styled as a distinct card ("THIS IS YOUR SATURN RETURN YEAR").
- Content: 1–2 paragraphs naming the window and what it asks (house-table grounded), the pass dates, and the add-on entry point.
- Pass dates also thread into season key-date lists (category `SELF`) so the return is visible across the report.
- Non-purchasers still get the callout facts (dates, window); the interpretation depth lives in the add-on.

**Tone contract (add to prompt rules + banned-phrase review):** describe pressure honestly; frame as invitation with the user in charge; never predict events; never moralize; forbid self-judgment language; close sections with concrete, slightly playful actions. This aligns with the existing `user_wellbeing`-adjacent editorial stance and Greene/Hand's "questions, not outcomes" rule.

### 5.3 Doctrine tables → knowledge package

`saturn-return-house` (12 rows) and `saturn-return-sign` (12 rows) datasets, distilled from the digests, owner-reviewed. Aspect modifiers can seed from existing `ASPECT-MEANINGS-REFERENCE.md` + Jacobs's aspect keywords.

### 5.4 UI

- Entry: You page card, eligibility-gated (active window or countdown state).
- Route `#/you/saturn-return` → `features/you/SaturnReturnReport.tsx` on the shared `ReportArticle` renderer (task F5); timeline section reuses the key-date bottom-sheet pattern.
- Envelope: `user_reports` row with `report_type = 'saturn_return'`, `period_start/end` = hot-zone window. Facts frozen; regenerate only on birth-data edit.

## 6. Task additions (extend the parent breakdown)

New phase **RD (reference docs)** before generators, then S tasks slotting into existing phases:

- **RD1.** Write distilled doctrine reference docs into `tldr-astro-phrasebank/`: `SOLAR-RETURN-DOCTRINE.md`, `SATURN-RETURN-DOCTRINE.md` (paraphrased, source-attributed, owner-reviewed). Feed prompt context and the four knowledge tables. *Blocks S3, S6.*
- **S1.** Y1 upgrade: full SR chart + `solar_return_analysis` (overlays, SRA, big-year score, lord-of-year-at-SR). Tests with Estadella case fixtures.
- **S2.** Knowledge tables: `sr-asc-natal-house`, `sr-sun-house` (+ build to dist). Owner review.
- **S3.** Year Ahead generator additions: `sr_moment`, `sr_stance`, `sr_sun`, `headline` units + SR facts merged into season bundles; F4 attribution formats for SR. *Depends: F-phase, S1, S2, RD1.*
- **S4.** `/timing/saturn-return` endpoint: pass scan, classification, cycle context, progressed-Moon prelude. Horizons-checked fixtures for known return dates.
- **S5.** Knowledge tables: `saturn-return-house`, `saturn-return-sign`. Owner review.
- **S6.** Saturn Return generators: 8 sections + second-return variant + the Year Ahead callout unit (`year_ahead_saturn_return_callout`) + tone contract additions to editorial gates. *Depends: F-phase, S4, S5, RD1.*
- **S7.** Saturn Return UI: highlighted add-on card (You page + Year Ahead callout entry point, shown only when the highlight rule fires), route, report view, timeline sheets.
- **S8.** Review cycles: owner approval per report (Saturn Return is ~10 units; SR additions ~5 units on top of Year Ahead's ~25).

Sequencing vs. the parent plan: RD1/S2/S5 (authoring) can start immediately, parallel to Phase F. S1 folds into Y1/Y2 (do it as one piece of server work). Saturn Return (S4–S7) is independent of the Year Ahead content phases and can ship before or after it; it is the smallest standalone premium product in the portfolio (~10 units, one calculation module, existing renderer) — **a good candidate to ship right after the relationship report.**

## 7. Open questions

- **Transit-house layer:** still unsourced — Tierney (now read) deliberately excludes transiting-Saturn-through-houses, and Jacobs doesn't use it. Current design omits it; ground it in Hand's *Planets in Transit* (in Resources) if added as v2 depth.
- **Location setting UX** for the SR: silent default to current residence, or an explicit setting? (Doctrine split documented in §3.2.)
- **Saturn Return pricing model:** one-time purchase fits the once-per-29-years cadence better than a subscription unlock — feeds the paywall plan.
- **Unknown birth time:** SR Asc and Saturn house are both unavailable — both reports degrade (SOURCE_GAP omission); decide whether to sell degraded reports or require birth time.
