# Voice rubric — sky placement long-form articles (the second judge)

The machine-readable source is
`packages/astro-knowledge/voice/tldr-astro/sky-article-longform.json`.
This document explains candidate `sky-article-longform-v6`; the runnable prompt
is `scripts/judge-article-voice.js`.

The placement/card judge owns only hook/lived/turn trios. This judge owns the
authored long-form layer: planet ingress and station editions plus nodes
articles. It never judges cards or trios. Lunation, season, overview, and
weekly articles remain reference corpora for separate future surfaces.

## House register

Marie Satori's long-form voice is a wise, direct friend who has done her
homework. It establishes felt or material stakes early, teaches through plain
corrections, speaks in second person, and repeatedly lands astrology in a body,
an ordinary scene, a relationship, a budget, a home, or a practical choice.

The register may be lyrical, polished, incantatory, and structurally dense.
Long paragraphs, careful metaphors, dated sections, and extended horoscope
blocks are canonical. “Direct and lived” does not mean casual, improvised, or
transcribed. The failure is sustained institutional, academic, consultative,
or generic abstraction that never returns to the reader's life.

Licensed forms include second person, real questions, contractions, one
owner-register first-person aside, and long blocks whose sentences earn their
place.

## Nine semantic checks

1. **Empathy first.** Establish the reader's felt or material stakes early.
   Felt-first is preferred for generated editions, but a date-led or
   transit-led opening passes when its first thematic paragraphs promptly make
   the event matter in human terms.
2. **Direct-lived register.** Judge the dominant register, not whether prose
   sounds improvised. Lyrical or formal passages pass when they return to
   direct address, the body, ordinary scenes, or material stakes.
3. **Concrete scene-runs.** Cash abstraction into real life somewhere. The
   word “Maybe” is not required.
4. **Command runs.** Commands are an optional source of momentum on every
   planet, including Mars, Uranus, and Saturn. Their absence is never a failure;
   questions, contrasts, short declarations, and direct choices can do the
   same work. Fail commands only when they become scolding, generic, or
   unsupported.
5. **Per-planet furniture.** Judge family resemblance, not a quota. Missing one
   optional device is soft at most; conspicuously importing another planet's
   structure is a failure. Generated fast-mover slots and owner narrative or
   retrograde editions are two canonical modes, not one required sequence.
6. **Teaching correction.** Include a grounded boundary, contrast, limit, or
   reframe that revises the reader's understanding. Exact trigger syntax is not
   required.
7. **Warm, forward close.** The editorial body may end with a benediction,
   affirmation, next-sign handoff, or final horoscope-block boundary, choice,
   permission, or forward-facing declaration. The last sign does not need a
   separate blessing. Ignore trailing page chrome.
8. **Horoscope-block function.** Judge the set holistically rather than forcing
   every block through a generated-template order. Across the set, look for
   house or life-area specificity, lived patterns, and usable movement. Those
   elements may occur in any order and need not all appear in every block.
9. **Recognizability.** Generated prose must not reproduce documented CHANI,
   Spirit Daughter, or AC phrasing constructions. AC timing devices
   may be adapted structurally, but theatrical titles and dense stacked metaphor
   remain out. Shared astrological knowledge and terminology are never flagged:
   Dragon's Head/Tail, decans, dignities, cazimi, and the tradition's vocabulary
   are common to astrologers. Owner-verbatim text is exempt from this one
   anti-imitation check only; provenance does not confer a score.

## Two non-semantic checks

10. **Engine/date QA.** Runtime dates and times come from the configured
    ephemeris and the user's local timezone. Historical dates, degrees, and
    timezone labels in owner articles are evaluation text only. This check is
    not sent to the voice model.
11. **Mechanical lint.** The long-form linter owns banned words, trade
    vocabulary, and literal adjacent-voice tics. It runs before semantic judging.

## Interpretation rules

- Judge the editorial body, not conversion headers, navigation, related posts,
  calls to action, or Shopify chrome.
- Treat devices as diagnostic evidence, not equal quotas.
- A concrete equivalent passes without a signature phrase.
- Do not impose the generated fast-mover slot order on owner narrative or
  retrograde editions.
- A score of 1 requires systemic material drift or one severe failure. One
  optional omission or licensed alternate opening/close cannot produce a 1.
- Owner-published pieces score 3 by definition. A false negative means the
  rubric or judge application is wrong, not the published piece.

## Verdict contract

- **3 — in voice:** no failed semantic checks; recommend approval, with human
  approval still required.
- **2 — borderline:** one or two named material checks are soft; route to human
  review.
- **1 — off voice:** at least one named failure and systemic drift or one severe
  failure; regenerate.

A score/verdict mismatch, unknown check ID, score 3 with failed checks, or score
2 without one or two named failures is a response-contract violation and
routes to human review.

V6 also requires exactly one evidence object for every failed check. Each
object carries the matching check ID, an exact sentence from the article, a
check-specific reason, and a concrete rewrite. The parser verifies that the
sentence exists in the submitted article and that evidence IDs exactly equal
the failed-check IDs. Missing, extra, duplicated, or unsupported evidence is a
contract violation. Shared evaluation reports retain only evidence hashes so
owner copy is not duplicated into portable artifacts.

## Calibration and corpus policy

The four active Saturn, Jupiter, and Uranus fixtures remain the production
calibration baseline. The expanded owner corpus adds Mercury, Venus, Mars, and
Chiron same-surface diagnostics plus adjacent-format references. Articles used
to diagnose v2–v5 are not blind promotion evidence.

CHANI and Spirit Daughter research is an anti-imitation boundary only. It does
not supply dates, doctrine, or generated copy. Runtime astrology continues to
come from the app's ephemeris and user-local timezone.

## Standing practice

Run the mechanical linter before this judge. Even a semantic 3 remains
advisory and cannot publish content. The placement/card judge never scores
long-form articles, and this judge never scores placement trios.
