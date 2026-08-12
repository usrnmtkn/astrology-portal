# Friend natal chart pronoun and grammar audit

Date: 2026-08-10. Trigger: owner spot-review of a friend natal chart (subject "Evergreen") found second-person leakage, redundant slot composition, and a grammar fault. Systematic scan of `fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json` confirms two structural bug classes plus row-level faults.

## Bug class 1: second-person vocabulary slots injected into they-voice frames

40 of 697 `vocabularyRows` are written in second person (e.g. row 109 "ego inflation, or needing the spotlight to feel like you matter"; row 111 "identity, vitality, and where you're meant to shine"; row 114 "what makes you feel safe"). Vocabulary slots have a single `body` and are composed into BOTH `body_you` and `body_they` frames, so every friend-chart render that pulls one of these 40 shows "you" mid-sentence inside third-person copy. This is the exact mechanism behind the owner's first find.

Fix (structural): give vocabularyRows a `body_they` variant (mirroring hookRows) and teach the resolver to select by person; author the 40 they-variants as review-gated candidates. Person-neutral rewrites of the single body are the fallback option but degrade the you-voice.

## Bug class 2: second-person leakage inside body_they frames (non-synastry)

769 non-synastry hookRows with a `body_they` contain bare second person after template-slot removal. Synastry/compat/bond rows were excluded (there, "you" addresses the reader legitimately). Concentrations: sky-placement families (~430), daily headline/body (112), lunation families (~70), element-pattern (14 — these are pure natal chart-pattern rows and are unambiguous bugs). Some sky families may be intentional reader-address even in they-context; each family needs a person-contract ruling rather than a blanket rewrite.

Fix: (a) owner rules on which families are reader-addressed even in friend context; (b) rewrite the remainder; (c) extend the pronoun-grammar gate (currently covering 377 authored transit rows) to ALL body_they hook rows and vocabulary slots so this cannot regress.

## Row-level faults (owner-identified, fixes pending owner wording)

1. `vocabularyRows[109]` — "ego inflation, or needing the spotlight to feel like you matter" → needs they-variant; e.g. "ego inflation, or needing the spotlight to feel like they matter."
2. `vocabularyRows[247]` — "protectively, tenderly, and by feel" composes redundantly after frames whose verb is "feel things" ("they feel things protectively, tenderly, and by feel"). Candidate: "protectively, tenderly, and on instinct."
3. `hookRows[366]` (`angle-sign/ascendant/pisces`, body_they) — owner correction: "Regular time to come back to themselves keeps this gift from emotionally draining them." (was "keeps the gift from draining them").
4. `hookRows[123]` (`placement-sentence/mercury/aries`, BOTH variants) — "The wit is real and so is the temper" (real-filler + detached articles) and "a second day before getting dropped" / "before dropping them" (translation-required). Candidate rewrites, pending owner:
   - body_you: "Your wit is quick and so is your temper. An idea you drop today might still be your best one, so give it a day."
   - body_they: "Their wit is quick and so is their temper. An idea they drop today might still be their best one, so it helps when they give it a day."

## Judge/lint gap

The deployed deterministic families (em_dash, certainty, keyword_stack, repeated_menu, whether) do not catch any of the above. The owner standards issued 2026-08-09/10 do: `real-filler`, `translation-required`, and pronoun-person contracts. These defect classes must be wired into the fallback-row lint and the card/article judges, and the friend-pronoun gate extended beyond the 377 authored transit rows.

## Status

Findings only; no serving rows were modified. All fixes are candidates pending owner wording approval, then queue per the serving-content merge model.
