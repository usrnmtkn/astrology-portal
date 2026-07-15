# CC aspect-pair review queue — status report

## What was promoted

All **84** `cc/aspect-pair/*` rows have been moved out of `EVIDENCE_ONLY_UNTIL_REVIEWED` into `REVIEWED_CLAUSE`, voiced and decomposed into transit-template slots. Output: `phrasebank/cc-aspect-pair-reviewed.json`.

Result: the transit templates (§4 of the mad-libs) now resolve for these 84 pairs instead of returning `SOURCE_GAP`.

| Cut | Count |
| --- | --- |
| Total pairs reviewed | 84 / 84 |
| Challenging (square / opposition) | 35 |
| Supportive (sextile / trine) | 32 |
| Conjunction | 17 |
| By aspect | square 20 · opposition 15 · trine 18 · conjunction 17 · sextile 14 |

Bodies covered: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron, North Node.

## How each row was reviewed

For every pair the raw evidence string was:

1. Read for its lived situation, habitual response, cost, meaning, and action.
2. Decomposed into the slot names the transit templates consume:
   - **challenging** → `lived_scene`, `habitual_response` (gerund form, to fit "___ may intensify ___"), `specific_cost`, `meaning_bridge`, `practical_action`
   - **supportive** → `available_opening`, `underuse_pattern`, `deliberate_participation`, `meaning_bridge`
   - **conjunction** → `two_functions_becoming_entangled_scene`, `function_a_lived`, `function_b_lived`, `concentration_action`
3. Rewritten in the Marie Satori voice and cleared of every prohibited seam. Notably, the raw rows used the banned "meets" join (`venus-square-saturn`: "Warmth meets caution"; `mars-square-saturn`: "urge to act meets a wall"; `moon-square-saturn`: "Emotions meet a cold wall"; `sun-square-pluto`: "Identity meets deep pressure"). All were reworded.
4. Tagged with `valence`, a recommended short template (4A/4B/4C) and, when the transiting body is an outer planet, a long template (4E Saturn · 4F Jupiter · 4G Uranus · 4H Neptune · 4I Pluto).
5. Given `source_keys` provenance: the pair key + `cc/aspect/{aspect}` + `cc/ref/aspect-psychology/{aspect}`.

## Verification

- `tests/build_aspect_reviews.py` → writes 84 reviewed clauses.
- Seam filter over **every** authored slot (420+ strings): **0 flags**.
- `tests/render_harness.py` extracts the 63 mad-libs templates, renders all 84 pairs through their transit template, and runs each output through the seam filter + the 10-point acceptance test: **84/84 pass**. The `mars-conjunction-ascendant` control correctly returns `SOURCE_GAP`.
- `tests/validate.py` (home/moon/natal/sky fixtures + resolver divergence): **17/17 pass**.

## Editorial status — important

These 84 are promoted to `REVIEWED_CLAUSE` at the **structural/voice** level (they satisfy the render contract, seam rules, and voice spec). Per the source-tier ladder, a human editor should still give final sign-off before serving verbatim — treat them as **APPROVED-for-generation, pending Marie/editorial confirmation**, not silently auto-served. `originalityCheck` is set on each; none reproduce a raw source string.

## Batch 2 — Sun-family + Jupiter–Chiron gap fill (13 pairs)

Authored to fix the pairs the live app was composing generically (see `QA-FINDINGS-live-output.md`), grounded in Hamaker-Zondag, *Aspects* (doctrine only, original voice). File: `cc-aspect-pair-reviewed-batch2.json`. Covers `sun-conjunction-{mercury,venus,mars}`, `sun-{square-uranus, square-mars, opposition-mars}`, `sun-{sextile,trine}-{neptune,pluto,uranus}`, `jupiter-square-chiron`.

## Batch 3 — the four angles × seven classical bodies (140 pairs)

File: `cc-aspect-pair-reviewed-angles.json`. Angle domains grounded in Robert Hand, *Planets in Transit* (Asc = how you meet the world/vitality; MC = vocation/authority/reputation; Desc = the person across from you; IC = home/roots/private base).

- **84 authored** clauses: conjunction, square, and trine for every (body × angle), each a distinct lived scene (no planet-function+angle-domain gluing).
- **56 derived** by exact geometry, not fabricated: **opposition to an angle = conjunction to the opposite angle** (reframed through the opposite pole — e.g. Mars opposition MC reads through the IC/home), and **sextile = the trine contact flagged "opportunity only if acted on."**
- Rendered as the natal-aspect paragraph (`scene. consequence. adjustment.` + factual footer) — the form the "Gifts / Challenges" page uses. A short-transit-card variant (template 4D, noun-phrase scene) is a documented follow-up.

## Batch 4 — outer planets → personal points, long transits (75 pairs)

File: `cc-aspect-pair-reviewed-outer.json`. Transiting **Uranus / Neptune / Pluto** to natal **Sun, Moon, Mercury, Venus, Mars**, mapped to the outer-specific long templates:

- **Uranus → 4G** (liberation/disruption), **Neptune → 4H** (dissolution/uncertainty), **Pluto → 4I** (transformation).
- Slots authored as **noun phrases** to fit each template's frame (e.g. Pluto 4I: "{control_pattern} has been protecting {underlying_vulnerability}, but it may now be intensifying {specific_cost}").
- Per (outer × personal): conjunction + hard (square/opposition) + soft (trine/sextile) authored; sextile flagged act-on-it, opposition flagged felt-through-others.
- Grounded in Robert Hand's per-aspect sections plus Liz Greene (*Outer Planets and Their Cycles*, *The Astrological Neptune*) and the Pluto/Uranus volumes in the reference folder.

Worked render (Pluto conjunct Venus, template 4I):
> Love turns intense and consuming, and a connection surfaces power, depth, or a compulsion you can't casually hold. The control you keep in how you love has been protecting a fear of being truly known, but it may now be intensifying giving far more than you get and calling it devotion. This transforms how you love by exposing what's been imbalanced. Get clear on what you actually want from the bond before the intensity decides for you. *The astro: Transiting Pluto conjoins your natal Venus. Orb: 1°.*

## Batch 5 — Saturn return cycle + Saturn → personal long transits (30 records)

File: `cc-aspect-pair-reviewed-saturn.json`. Template **4E** (restructuring). Grounded in Tom Jacobs, *Saturn Returns* (the return as becoming your own authority) + Robert Hand.

- **Saturn return cycle** (Saturn → natal Saturn): conjunction (the return, ~29/58), square (waxing/waning crisis, ~7/21/36/43/51), opposition (~14/44), trine, sextile.
- **Transiting Saturn → natal Sun, Moon, Mercury, Venus, Mars**: conjunction + hard + soft.

Worked render (the Saturn return, template 4E):
> The life you built through the last cycle gets weighed, and whatever isn't truly yours starts asking to be rebuilt on real foundations. A structure you inherited or defaulted into is being tested against who you actually are now. This is the return: you stop borrowing authority and start becoming your own. Commit to the version of your life you'd actually choose and let the rest fall away. Because Saturn is slow and stations, the reckoning arrives in passes; treat each as a checkpoint, not a final grade. *The astro: Transiting Saturn conjoins your natal Saturn. Orb: 1°.*

## Batch 6 — the natal lunar nodes (24 placements)

File: `cc-node-reviewed.json`. The nodes are a natal **axis**, not an aspect: North Node = growth direction, South Node = the familiar past to release (always the opposite sign/house). Grounded in Elizabeth Spring, *North Node Astrology*; Rudhyar, *The Lunar Nodes*; *Healing the Soul*.

- **North Node through 12 signs + 12 houses**, each naming its South Node counterpoint, rendered as a Me/Natal paragraph (`growth. the easy pull backward is X. one practice.`).
- Editorial catch during build: the 9th-house line tripped the keyword-list guard (a 3+ comma run) and was tightened — the same rule that protects the aspect copy protects the node copy.

## Batch 7 — Jupiter → personal long transits (25 records)

File: `cc-aspect-pair-reviewed-jupiter.json`. Transiting **Jupiter** → natal Sun/Moon/Mercury/Venus/Mars, template **4F** (opening/expansion), conjunction + hard + soft. Grounded in Robert Hand's Jupiter sections. Hard aspects carry the overreach/overindulgence shadow (Jupiter's "too much of a good thing").

## Voice calibration (Marie's own writing)

`copy/MARIE-VOICE-CALIBRATION.md` captures Marie's actual copy from mariesatori.com / @mariesatori (incl. a full per-sign horoscope and 10 CONFIRMED pull-quotes) and distils the voice signature against the 391 clauses. Finding: the clauses are **on-voice structurally**; the gap is register (mine run slightly more earnest/general than Marie's dryer, more specific, occasionally irreverent copy) — a **light tone pass, not a rewrite**. Worked before/after tunes included.

## Tone pass — Marie calibration applied to all 391

`tests/tone_pass.py` applied the calibration to every record: uniform register normalization (contractions, de-"genuinely") across all 391, plus **20 flagship hand-tunes** — full dry/specific rewrites spanning every family — that lock the target register as the pattern for editorial sign-off. Stamped `tone_version: marie-calibrated-v1`. Re-validated: **0 seam flags, 391/391 renders, 17/17 suite**. Example: Venus square Saturn action is now "Ask for what you need out loud, and stop grading the whole thing by its coldest hour."

## Batch 8 — outer planets → the four angles (60 records)

File: `cc-aspect-pair-reviewed-outer-angles.json`. Transiting **Uranus / Neptune / Pluto** to Ascendant / Midheaven / Descendant / IC — among the most significant slow transits (e.g. Pluto conjunct MC). Conjunction/square/trine authored; opposition + sextile derived by geometry. This **completes the full angle matrix** (classical seven + transpersonal three × four angles). Grounded in Hand + Liz Greene, *Outer Planets and Their Cycles*. Already carries `tone_version: marie-calibrated-v1`.

Worked render:
> **Pluto conjunction Midheaven** — Your public role is being transformed, and a version of your ambition has to die for a truer one to rise. Power, exposure, or a reckoning enters your career. Rebuild the vocation on what's real, and release what was only status.

## Batch 9 — Chiron, the wounded healer (49 records)

File: `cc-chiron-reviewed.json`. Two types, rendered as Me/Natal paragraphs:
- **Placements:** Chiron in sign (12) + Chiron in house (12) — the wound + the gift it becomes + one practice.
- **Aspects:** Chiron → Sun/Moon/Mercury/Venus/Mars (conjunction + hard + soft) — the wound-scene + recurring pattern + healing move.

Grounded in the wounded-healer archetype (Chiron material across the reference folder). Already `tone_version: marie-calibrated-v1`.

Worked render:
> **Chiron in Virgo** — Your oldest wound is around never being good enough: a voice that says you're broken or not yet ready. You can offer others real acceptance and useful help, because you know that voice intimately. Leave one thing imperfect on purpose and notice nothing breaks.

**Chiron → angles** (`cc-aspect-pair-reviewed-chiron-angles.json`, 20 records): Chiron to Ascendant/MC/Descendant/IC, completing the Chiron matrix (personal planets + all four angles).

## Banned-register lint + Marie's own lines woven in

- **Register lint:** "shrink" (and "take up space", "hold space", "alignment") added to `seam_filter.check_register`, now run inside the harness acceptance test. It caught four of my own uses (including the Chiron-MC "shrink from visibility") — all reworded. The bank is now free of the reflexive filler on Marie's ban list, and any new copy that uses it fails validation.
- **CONFIRMED pull-quotes:** `tests/attach_pullquotes.py` attaches Marie's actual lines (from the calibration corpus, tier CONFIRMED / serve-verbatim) to thematically-matching records as an optional `pull_quote` closer. **30 records** now carry one of her exact sentences — e.g. Chiron in Virgo → "Stop wearing burnout like a badge of honor. It's just burnout."; North Node in Taurus → "Stop proving your worth to people who can't even recognize their own."; Saturn return → "Grieve the version of you who worked so hard to try to make broken things work."

## Full CONFIRMED corpus mined + attached (127 of Marie's lines)

`tests/build_confirmed_quotes.py` extracts **all 127** of Marie's own lines from `marie-source-phrases.json` (81 pull-quotes + 36 essay-quotes + 10 aphorisms) into `phrasebank/marie-confirmed-quotes.json`, tier CONFIRMED (serve-verbatim, never linted). `tests/attach_pullquotes.py` then matches them to records by theme (sign / house / body / aspect), capped per line. **136 records** carry one of **38 distinct** Marie lines as an optional closer; the remaining lines stay in the corpus as MANUAL_ONLY for editor selection. Examples: Chiron in Gemini → "Trust that your voice is enough."; North Node in Capricorn → "Authority is the power to make choices about your own life. Status is the role that you play for other people."; Chiron in 2nd → "Stop equating your worth with how much you own."

Reproducible via `tests/build_all.sh` (builders → tone pass → corpus → attach → validate).

**Grand total reviewed records: 520** — 447 transit aspect/angle/return + 24 nodes + 49 Chiron placements/personal-aspects. Harness renders **520/520** valid; suite 17/17; SOURCE_GAP control `pallas-conjunction-sun` (asteroid) holds.

## Remaining SOURCE_GAP surface (still returns SOURCE_GAP by design)

The templates will continue to gap on pairs with no reviewed exact source. Remaining missing families:

- **Node transits** — transiting nodes to natal points (distinct from the natal node placements already authored).
- **Asteroids / minor points** (Pallas, Ceres, Juno, Vesta) if the app surfaces them — the `pallas-conjunction-sun` control sits here.

Coverage is now broad: every planet → personal and → angle long transit, the natal nodes, and Chiron placements + personal aspects. Remaining items are the long tail above. Until authored, each correctly resolves to `SOURCE_GAP`.

_Note: the folder's specialist texts anchor each remaining batch — Tom Jacobs *Saturn Returns* and the *Stellium Handbook* for concentrated-placement / return work, the Pluto/Uranus/Neptune volumes for outer-planet depth, and the node books for the lunar axis._
