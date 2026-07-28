# Codex: fix v3.4 unknown-time cross-level duplication + add a deterministic dup check

## What the keyed judge run exposed (real bug, not strictness)
On the UNKNOWN-TIME render path, the v3.4 overview (Level 1) repeats whole sentences
verbatim from level_2 (Level 2). Confirmed objectively by rendering the fixtures and
diffing sentences across levels:

- mystic-rectangle-a [unknown-time] - 4 sentences shared between overview and level_2:
  - "Pluto and Uranus move slowly, so their signs, Gemini and Sagittarius, describe a generation..."
  - "In this pattern Pluto carries pressure, power, and what has to change, while Uranus carries..."
  - "Your Moon in Leo loves big"
  - "Your Jupiter in Aquarius grows best in a crowd"
- grand-square-a [unknown-time] - 4 sentences shared (Moon/Virgo, Mars/Pisces, the two
  slow-planet generational sentences).
- isolated-t-square-a [unknown-time] - lived sign-need line "In this part of life you
  also need meaning and gentleness" appears under Level 2.

This is why 11/12 fixtures scored 2 (human-review) and only grand-square known-time hit 3.

## Fix 1 - template (root cause), v3.4 unknown-time
Trim the unknown-time OVERVIEW to a short lived hook that does NOT restate level_2. The
generational sentences ("...move slowly, so their signs... describe a generation"; "In
this pattern X carries...") and the planet-in-sign lines belong in ONE level, not both.
Keep them where they read best (level_2 for the geometry framing / L1 for the lived
hook) and remove the duplicate from the other. For T-square, keep the sign-need line in
Level 1; it must not appear under Level 2.
Re-run validate_patterns / render_matrix / gold_render after - they should stay green
(this is prose de-duplication, not a token change).

## Fix 2 - make it a DETERMINISTIC gate (no model needed)
Add a cross-level verbatim-sentence check to scripts/lint-pattern-voice.js so this class
of defect fails mechanically, not only via the LLM judge. Logic (already prototyped):

    // normalize: trim, lowercase, strip .,;: ; keep sentences >= 6 words
    // L1 ids = {overview, feel}; L2 ids = everything else except confidence_note
    // if the same normalized sentence appears in an L1 block AND an L2 block -> FAIL
    //   term: "cross-level-dup", reason: "a sentence is repeated across Level 1 and Level 2"

This runs on the structured card (which the linter already receives), needs no key, and
turns the judge's finding into a red mechanical gate until Fix 1 lands.

## After both
Re-run `npm run test:pattern-voice` with the key. Expect: the three flagged unknown-time
cards clear their cross-level dup, and their judge scores rise (the verbatim-repeat
complaint was their weakest line). Remaining 2s should be only the "slightly generic /
soft line" category - a copy-polish decision, not a bug.

## Note on the other 2s (category b, lower priority)
Kite "Your Uranus brings a form that survives being done differently" and a few
relationship-level lines read generic/wordy to the judge. That is copy polish on the
v3.4 source values, not a structural fault; safe to leave at 2 = review or tune later.
