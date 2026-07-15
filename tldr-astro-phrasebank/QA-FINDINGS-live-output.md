# QA findings — live webapp output (6 screenshots)

Reviewed: two natal placement pages (Sun in Aquarius 9H, "You" and "Friends" views; Jupiter in Leo 3H), one Sky retrograde page (Mercury Rx in Cancer), one Sky list.

## Verdict

The **sign / house / sect / ruler synthesis reads well and on-voice** — that layer is working. Every serious defect is in the **aspect renderers** (natal "Gifts / Challenges" and current-sky "Aspects to X"). They are composing generic keyword copy for pairs that have no reviewed source, instead of returning `SOURCE_GAP`. That is the exact failure mode the contract exists to prevent.

## What's good (keep)

- Sun in Aquarius 9H body: "Their sense of direction sharpens when they can think independently and contribute something useful to a larger group. They may be the person who names the rule everyone else has stopped noticing." — matches the calibration exemplar, on-voice.
- House synthesis, "The Sun is your light leader" sect layer, dignity chip (`29°25' · Constrained · Detriment`), retrograde-at-birth layer, and ruler bridge ("Aquarius answers to Saturn. With Saturn in Virgo in the 4th house…") are all correct and integrated.
- "You" vs "Friends" pronoun switching mostly works (first vs third person).

## Bugs (fix), in priority order

### 1. Generic fallback used instead of SOURCE_GAP for un-reviewed aspects  — CONTRACT VIOLATION
Every aspect shown is a pair with **no reviewed source**, yet the app emitted composed prose instead of gapping. Confirmed against the reviewed bank — all of these were absent:
`mercury-conjunction-sun · neptune-sextile-sun · pluto-trine-sun · uranus-square-sun · mars-conjunction-sun · sun-conjunction-mercury · chiron-square-jupiter`.
The renderer is filling a formula like `"{other} {aspect} {focal}: {focal_function} … {generic tail}"`. This is the keyword-composed fallback the system must refuse. **Fix:** route natal-aspect and sky-aspect rendering through the reviewed-clause-or-`SOURCE_GAP` path; delete the generic aspect composer.

### 2. Identical copy across different aspects  — symptom of #1
- "Neptune sextile Sun" and "Pluto trine Sun" rendered **the same sentence** ("…gives their direction and confidence when it is time to be seen an easier route. Let the opening become one practical choice…").
- "Mercury conjunction Sun" and "Mars conjunction Sun" rendered the **same conjunction template** ("…concentrates their direction and confidence… The useful question is what gets louder when this contact is active.").
Two different aspects must never produce identical prose. Fixed structurally by #1 + real per-pair copy (below).

### 3. Banned "meets" seam shipped to the reader  — SEAM LEAK
Sky page, Mercury Rx: **"Sun conjunction Mercury: direction and confidence when it is time to be seen meets the way a thought becomes a message, plan, or decision in one active sky pattern."**
This is `{funcA} meets {funcB}` — the prohibited join, and a raw concatenation of two planet-function strings. The package seam filter flags it (`FLAG: "seen meets the"`). **Fix:** the seam filter is not running on sky-aspect output; wire it into that renderer's acceptance gate.

### 4. Pronoun object-case bug  — GRAMMAR
Friends view: "…before it starts making the choice **for they**." Should be "for them". The third-person template is interpolating the subject pronoun into an object slot. **Fix:** separate `{subject_pronoun}`/`{object_pronoun}` in the pronoun table (they/them, she/her, he/him).

### 5. Subject-verb agreement + dangling participle  — GRAMMAR
- Jupiter in Leo: "Your faith and appetite where life asks for a wider view **tends** to work…" → compound subject needs "tend".
- Mercury Rx: "Mercury is in Cancer. **Putting** more attention on the way a thought becomes a message…" → orphaned participle with no subject; should be "It puts more attention on…" or joined to the prior clause.

### 6. Planet-function + sign-flavor gluing  — MECHANICAL COMPOSITION
Sky list appended one Cancer tail to every planet: "Moon in Cancer: puts attention on the instinct to restore safety … **by tracking memory and the emotional cost of a decision**" and "Mercury in Cancer: … **by tracking memory and the emotional cost of a decision**." The `by {sign_flavor}` clause is glued onto each planet-function mechanically (and "emotional cost of a decision" doesn't fit the Moon). **Fix:** collective planet-in-sign should draw one authored per-combination line, not `function + "by" + sign_flavor`.

## Fixes delivered in this package

**Content (the gap the app was papering over):** authored the 6 pairs from the screenshots + their siblings + Jupiter–Chiron as real reviewed clauses, grounded in reference doctrine (Hamaker-Zondag, *Aspects*) and written in original voice. See `phrasebank/cc-aspect-pair-reviewed-batch2.json` (13 new pairs). All 6 formerly-faked pairs now resolve to real copy; the reviewed aspect-pair bank is now **97** pairs.

Example — Sun conjunction Mercury (was the "meets" seam), now rendered through template 4C:
> Who you are and how you think and talk run as one, so your opinions feel like your identity. It may be difficult to separate the need to be seen and to matter from a fast, restless mind that wants to say what it thinks right now. Say the idea, then leave real room to hear the reply.

**Verification:** `tests/render_harness.py` now renders 97/97 reviewed pairs through their templates and passes the seam filter + 10-point acceptance test; the `mars-conjunction-ascendant` control still correctly returns `SOURCE_GAP`.

## Still gapped by design (next content batches)

Planet–angle pairs (all four angles — the app faked none of these yet but will), and the remaining outer-planet→personal long-transit combinations. These correctly return `SOURCE_GAP` until authored. Recommended next batch: the four angles against the classical seven bodies (doctrine available in Robert Hand, *Planets in Transit*, in the reference folder).

## Two-line summary for the app team

1. **Code:** natal-aspect and sky-aspect renderers must go through reviewed-clause-or-`SOURCE_GAP` and run the seam filter before output. Kill the generic `{func} {aspect} {func}` / `{func} by {sign_flavor}` composers. Fix the object-pronoun and subject-verb templates.
2. **Content:** ship the reviewed aspect-pair bank (now 97 pairs) so those surfaces have real copy instead of a formula.
