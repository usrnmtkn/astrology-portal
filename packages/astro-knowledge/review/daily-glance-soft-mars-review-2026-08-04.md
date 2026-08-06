# Review: daily At-a-Glance soft/mars pair

Date: 2026-08-04
Reviewer: editorial assistant (advisory; nothing here changes approval status)
Rows: `fallback-hook/daily-headline/soft/mars`, `fallback-hook/daily-body/soft/mars`
Location: `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json` (~29479, ~29488); build copy in `bundled-deferred-core-rows-v3.json` (~14288)
Trigger: transiting Moon trine or sextile natal Mars within 5 degrees, tightest contact of the day; served verbatim, engine-hidden register (no astrology vocabulary by design). Surface is transit-to-natal, so second person is allowed (ST-009).

## 1. Current serving text

Headline: "Today effort and results are actually connected for once."

Body: "Energy flows clean today: no friction, no drag, just capacity. Stop spending a day like this on maintenance and errands. Momentum this smooth is for the thing that scares you a little. Start it now, while starting is cheap. Future-you says thanks."

## 2. Findings

Headline.

- H1. "Today effort" garden-paths without a comma; the opening parses as one noun phrase on a tired read. Fails OV-040 (morning-reader test).
- H2. "actually ... for once" injects cynicism the transit does not supply; it tells the reader their normal state is futility. Nothing in Moon-soft-Mars derives this.

Body.

- B1. "Energy flows clean" is vague energy language (VC-007 family; same boundary the owner drew in CF-015: judge the sentence, and "energy" as an unnamed force fails it). Nothing observable is named.
- B2. "no friction, no drag, just capacity" overpromises: a soft lunar contact signifies mild, hours-long ease, not zero resistance. Scale mismatch with the transit's actual scale (the OV-039 principle) plus polished triadic symmetry (VC-011).
- B3. "Stop spending a day like this on maintenance and errands" is prescriptive about ordinary life, and it exposes a batch formula: Mercury has "Stop spending the clarity...", Venus "Stop rationing...", Saturn "Stop saving...". Move 2 of the four-move structure renders as "Stop + gerund" across the batch, which makes the rows interchangeable (VC-011).
- B4. "the thing that scares you a little" is motivational-copy invention; not derivable from this contact, and it sits in the CC do-the-scary-thing register (VC-013/VC-019 family).
- B5. "Start it now, while starting is cheap" is a compressed aphorism (OV-038).
- B6. "Future-you says thanks" is a meme-register sign-off in the "You got this" fingerprint family (VC-019) and a stacked ending after the action is already given (VC-010).

The astrological seed (Mars = effort/starting; soft = ease/available momentum; advice = use it) is sound. The overreach is entirely in execution.

## 3. Governance status

Both rows carry `review_status: "approved"`, set with Copy Batch A on 2026-07-23. Under GR-001 only explicit owner approval of exact wording changes approval status; the owner reports these issues were never corrected before the flag was set. The current "approved" flag is therefore not valid owner approval. Recommended: owner formally moves both rows to `review_needed` until corrected wording is explicitly approved (D1 below). Because the "Stop + gerund" formula and similar overreach appear in sibling rows, the whole Batch A set (136 rows) likely deserves an audit pass at the proven cadence of seven per sitting (D2).

## 4. Implementation gaps (code, for Codex after sign-off)

- G1. Applying check missing. The assembly spec (section 3) and the resolver comment both say "tightest applying aspect," but the selection in `apps/web/src/App.tsx` (~line 1792) takes the smallest orb regardless of applying/separating. Needs: compute applying vs separating from the Moon's motion relative to the natal point; prefer applying. Open question D3: when only separating contacts are within 5 degrees, use the tightest separating contact or fall through to the house fallback? Spec is silent.
- G2. House topic never used with an aspect. Spec section 3 says the Moon's whole-sign house supplies the topic, but the shipped content model (4 groups x 14 targets, house only as no-aspect fallback) has no house dimension when an aspect exists. Either amend the spec sentence to match the shipped model (cheap, recommended) or expand the content model by a house axis (4 x 14 x 12 x 2 rows; not recommended). Owner decision D4.
- G3. Flag: every Batch A row has `body_they` identical to `body_you`, second person included ("scares you", "Future-you"). If the daily glance ever renders in they-mode, the register is wrong. Confirm whether they-mode is reachable; if not, note it; if yes, this is a separate correction batch.

## 5. Draft correction candidates

DRAFT, assistant-authored. Not owner voice, not approval candidates until the owner line-edits and explicitly approves exact wording. New candidate IDs on any material revision (GR-004).

Headline candidates:

- HC-1: "Today, effort turns into results."
- HC-2: "Today, what you start actually moves."

Body candidate (keeps the four-move shape, honest scale, no formula "Stop"):

- BC-1: "Starting things comes easier today: you begin, and it moves. Some of that can go to errands, but not all of it. Pick the thing you keep putting off and give it the first hour while starting feels this easy."

## 6. Sign-off sheet

Each decision needs an explicit owner sentence naming artifact and scope.

- D1. RESOLVED: applied 2026-08-04 as part of the full Batch A demotion (all 136 rows to `review_needed`). Owner, chat, 2026-08-04: "the app is in beta with no users. There is no concern about moving content back into draft or review." See triage file D6.
- D2. Scope of the wider Batch A audit: (a) soft/mars pair only for now, (b) the 8 soft-group pairs, (c) all 136 rows in sittings of seven. OWNER: ____
- D3. Applying-aspect fallback when only separating contacts are in orb: (a) tightest separating contact, (b) house fallback. OWNER: ____
- D4. Spec section 3 house-topic sentence: (a) amend spec to match shipped model, (b) expand content model with a house axis. OWNER: ____
- D5. Approve exact corrected wording for the two rows (after line-editing section 5 or supplying her own). OWNER: ____

## 7. Prepared Codex prompt — SUPERSEDED (code work completed 2026-08-04 via the fact-packet hand-off; see rebuild plan implementation status. Item 1 below, the row wording replacement, waits on the owner-approved reference pair.)

---
Repo: tldrastro (usrnmtkn/astrology-portal). Task: daily At-a-Glance corrections.

1. In `apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json`, rows `fallback-hook/daily-headline/soft/mars` (~29479) and `fallback-hook/daily-body/soft/mars` (~29488): replace `body_you` and `body_they` with [OWNER-APPROVED WORDING, D5] and set `review_status` per [D1/D5 state]. Regenerate `bundled-deferred-core-rows-v3.json` via the existing build step; confirm the bundled copy matches source.
2. In `apps/web/src/App.tsx` (~line 1792), the daily glance selection takes the Moon's smallest-orb contact without an applying check. Add applying/separating determination (orb decreasing when the faster-moving Moon closes on the exact aspect angle to the natal longitude). Prefer the tightest APPLYING contact within 5 degrees. If none is applying, [D3 decision]. Unit-test: one applying and one separating fixture per aspect group, plus a no-contact fixture that exercises the house fallback.
3. In `apps/web/src/content/fallbackArchitectureV3/admin/DAILY-HOROSCOPE-ASSEMBLY-SPEC.md` section 3: [D4 decision; if (a), reword the driver sentence so the house supplies the topic only in the no-aspect fallback, matching the shipped 4x14+12 model].
4. Report changed files, test results, and the review_status values you wrote. Do not alter any other Batch A rows.
---
