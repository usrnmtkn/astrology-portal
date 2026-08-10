# Prompt: Writing harness v3 rebuild (register ruling + comparison judging + runtime verdicts)

Copy everything below the divider to Codex. Self-contained: the new owner ruling is inlined.

---

Owner instruction, 2026-08-09. The live semantic evaluation of writing harness v2 (gold 5/12, seven false positives; four correct-category/wrong-verdict negatives) diagnosed two architecture defects, not tuning problems. Rebuild the card-writing harness on the report-judge v3 architecture, which has already passed calibration. Writer promotion stays blocked. PR #137 is amended at the review wall; nothing merges.

Governance first: **no billed or model calls in this task.** The authorization rule applies to every billed evaluation in every harness, this one included: each live run requires explicit owner authorization naming the call budget beforehand. Record this in the harness README and enforce it with the same authorization-token gate the report calibrator uses.

## 1. Land the register-per-surface ruling

Create `tldr-astro-phrasebank/TLDR-REGISTER-PER-SURFACE-RULING-OWNER.md`, byte-for-byte, `needs_review` (owner approval pending; the harness rebuild may proceed against it, but nothing activates until the owner approves it and the rebuilt rubric):

````markdown
# Register-per-surface ruling (owner ruling, canonical)

**Status: DRAFT FOR OWNER APPROVAL, 2026-08-09. `needs_review`. Synthesizes recorded owner rulings (the pass-5 card tonal ruling, the lived-prose standard, the 27-point standard) into one governing rule. On explicit owner approval, every validator, critique checklist, judge rubric, and writer prompt becomes surface-scoped under it.**

## The rule

TLDR Astro has two owner-approved voices. They are both the owner's voice. They are never interchangeable, and no grader may apply one surface's rules to the other surface's copy.

### CARD register

Applies to: transit cards, natal cards, aspect-family copy, compatibility cards, and other short app surfaces.

- The hook comes first. Never open with an aspect thesis ("Jupiter enlarges...", "An opening appears..."). The reader gets "Follow the introduction." or "The opportunity is getting bigger. The agreement around it is not." first; the astrology explains why after the copy has landed.
- Wit, cadence, permission, and point of view are allowed and wanted: "look here", "take the win", "notice what happens", "you are allowed to".
- Direct address, short paragraphs, a closing "The astro:" attribution line.
- Concrete stakes stay mandatory: work, money, time, access, recognition. Warmth never replaces the observable life.
- A hook must be earned by the copy beneath it. A tagline with no developed consequence under it is a defect; the hook itself is not.

### REPORT register

Applies to: purchased personalized reports, all domains and horizons.

- Governed by the lived-prose standard and the 27-point GENERATION STANDARD in full.
- Observation and consequence; the reader's week, not the writer's framing.
- No permission language, no coaching, no manufactured warmth, no inspirational closers, no "take the win". What reads as personality on a card reads as intrusion in a report.
- Attribution lines carry the astrology; prose carries the life.

### Shared bans (both registers, always)

Em dashes; "whether"; wellness/therapy vocabulary (honor your needs, protect your energy, prioritize self-care, holding space); soulmate/twin flame/"your person"; astrologer persona ("I think", "I'm watching"); invented symptoms, diagnoses, crises, or outcomes; life-status assumptions; predictions past the specificity ceiling.

## Enforcement

1. Every validator, critique checklist, and judge rubric declares its surface. A card grader loads card rules and card exemplars; a report grader loads report rules and report exemplars. Cross-application is a build failure, not a style disagreement.
2. Owner voice evidence is surface-scoped: card gold exemplars judge cards; report finals judge reports. Never mix comparison sets across surfaces.
3. A defect category may exist on both surfaces with different definitions (e.g. an undeveloped tagline is a card defect; any tagline is a report defect). The definition lives with the surface.
4. This ruling is version-pinned like all canonical documents. Changes require a new version and fresh owner approval.
````

## 1b. Load the card-transit writing standard

A second owner ruling now exists: `tldr-astro-phrasebank/TLDR-CARD-TRANSIT-WRITING-STANDARD-OWNER.md` (owner text verbatim, 23 sections; the owner will supply it if not in your checkout). It is the card-register counterpart of the report lived-prose standard. Wire it in three places: (a) the writer prompt for all card-surface generation loads it verbatim, with §23 as the top-level direction for planetary-file rewrites; (b) the card critique checklist derives its diagnostic questions from §21 (the 15-question editorial test, with its astrology-failure vs writing-failure split) and its before/after examples from §§1–15 and §20; (c) the writer chain's internal revision passes follow §22 (the seven-pass loop). §17 rules that `DO NOT ASSUME` fields stay internal and never become reader-facing disclaimers — enforce with a validator.

## 2. Rebuild the rubric as comparison-based judging

Replace the style-adjective checklist (clarity, metaphor, self-help, tagline as freestanding rules) with the v3 pattern:

- **Input packet, fail-closed:** the complete card; two or three owner gold cards for the SAME surface performing comparable functions, each with evidence ID and provenance, shown side by side; labeled negative examples explicitly excluded from positive voice evidence; deterministic validator results. The candidate is forbidden from its own comparison set (assert in the contract test).
- **Voice is judged by observable drift from the supplied exemplars,** with findings citing evidence IDs — never by conformity to style adjectives. A card is not defective for having a hook, wit, or permission language; those are the register. The seven run-1 false positives (gold Aries/Taurus/Gemini/Leo/Virgo/Capricorn/Aquarius with their flagged categories) become labeled do-not-flag examples in the rubric.
- **Redefine the category set against the card register.** Keep genuinely card-scoped defects: `stock_trope`, `example_proves_astrology`, `metaphor_requires_translation`, `house_bleed`. Redefine `tagline_stands_alone` as an *undeveloped* hook (hook with no consequence beneath it), not the presence of a hook. Drop or fold any category that only restates "this sounds like a card."

## 3. Runtime-computed verdicts

The model returns categories, locations, and evidence only — never a verdict. The harness maps findings to PASS/REVISE/FAIL deterministically from a severity table in config (e.g. shared-ban violation or astrology error → FAIL; register defect with evidence → REVISE; no findings → PASS). This mechanically converts run 1's four correct-category/wrong-verdict cases into correct outcomes. Unit-test the mapping with those four cases as fixtures.

## 4. Evaluation settings and contracts

- Same model settings as report-judge v3 calibration — full reasoning, not low. Low reasoning for semantic voice judgment is the documented suspect in the gold false-positive rate; say so in the PR.
- Paired-fixture calibration, v3 style: gold cards must PASS; each negative is a degradation of a gold card on one named dimension and must produce its target category; positive and negative share the identical comparison set and packet.
- Deterministic contract test: packet completeness, no self-comparison, verdict-mapping table, index/location conventions supplied as data.

## 5. Gates and handoff

Full tests, typecheck, production build, artifact regeneration, `git diff --check`. Update PR #137 in place; it stays at the review wall. Writer promotion stays blocked.

Finish with: files changed; the rebuilt category table (card-scoped definitions); the fixture-pair table with configured contracts (no live results — no calls were authorized); and the owner-pending list: (1) approval of the register-per-surface ruling, (2) approval of the rebuilt card rubric, (3) separate authorization for the next live evaluation — propose 20 calls, same fixture set, full reasoning.
