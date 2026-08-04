# Method: harvesting owner-corpus foundation lines for placement articles

Purpose: every reader-copy surface checks whether the owner's published writing contains a warmth
beat that fits the article's emotional core - the moment the article stops diagnosing and turns
toward the reader. This is the repeatable process for finding those lines. It exists because invented
warmth lines fail the owner's read; a missing warmth beat is acceptable.

Established 2026-08-04 during the batch-1 revision cycle. First applied output: the six foundation
lines for batch 1 (recorded with the batch's provenance).

## The steps

1. **Name each article's emotional core in one phrase.** The feeling under the shadow, not the
   behavior. Mars in Capricorn's core is "rest must be earned." Jupiter in Leo's is "worth measured
   by applause." Mars in Scorpio's is "control standing in for trust." If the core cannot be named in
   one phrase, the article's turn is not sharp enough yet - fix that first.

2. **Turn each core into search words.** The feeling and its variants, not the scene's nouns:
   exhaustion / burnout / rest; applause / seen / performing; testing / trust / control;
   perfectionism / checking; curiosity / noise / scattered; help / burden / weakness / alone.

3. **Search the owner corpus.** `voice/tldr-astro/fixtures/sky-article-longform/owner-corpus/
   reference-surfaces/` plus the `TLDR-Article-Edition-*-OWNER.md` files. Also check the VB-005
   signature-phrase inventory in the owner feedback audit (keeping the peace, trying to earn, need to
   prove, old wounds, breaking point, center stage) - a hit there is a hit on her most repeated
   language.

4. **Keep only turn-toward-the-reader lines.** Two kinds qualify: lines that name the feeling from
   inside ("The exhaustion isn't from giving; it's from giving without receiving") and lines that give
   permission or reassurance ("Being vulnerable doesn't make you a burden. It makes you human.").
   Skip pure observations, however sharp - observation is what the rest of the article already does.
   If no qualifying line exists, record `harvest_mode: none_found`. Do not keep searching until a weak
   match passes, and do not manufacture a substitute.

5. **Prefer pronoun-free lines; collectivize minimally otherwise.** A line with no "you/your" can be
   used verbatim and carries the strongest authority. Lines with second person get the smallest
   possible edit into collective voice ("You don't have to earn rest through exhaustion" becomes
   "Rest does not have to be earned through exhaustion"). Drop any line that needs the ban list
   fought to survive (people, performance, leak, and the rest).

6. **Record the result.** For a match, record `harvest_mode: matched` and the source article per line;
   the provenance link is what makes the adapted article owner-corpus-derived instead of generated. For no match, record
   `harvest_mode: none_found` and a non-blocking editorial flag so future owner writing can be checked.

## Placement in the article

When a foundation exists, the warmth beat lands where the owner's own articles put it: after the
shadow has been named, usually at or near the end of the development section, before the close. One
beat is the maximum, not a requirement. When `harvest_mode: none_found`, use no warmth beat.

## Other surfaces

The method applies anywhere reader copy needs the owner's temperature. Per surface:

- **Aspect cards (Sky page):** the human-moment beat of each entry IS the emotional core, so step 1
  is pre-done for the whole corpus. Harvest against it; the beat lands as the body's final sentence,
  and the same harvest sharpens TLDR lines.
- **Calendar / timing events:** the timing composition contract's sixth component ("owner voice
  models") is selected BY this method - match the event's core (Mercury Rx: returning is not failing;
  cazimi: clarity inside the muddle; Venus Rx: old terms vs the present pull) to the owner's
  retrograde and transit articles instead of picking passages generically.
- **Lunations:** near one-to-one mapping; the owner corpus is mostly lunation writing.
- **Scale rule:** the beat must fit the card. Full articles may hold one supplied warmth sentence. A
  short preview uses `harvest_mode: vocabulary_only`: supplied foundations may guide word choice but
  do not add a warmth sentence.

## The corpus is never a quota (OV-042, global)

No pipeline may fail, block, or demand new owner writing because the corpus lacks a matching line.
When the harvest finds nothing for a core, generation proceeds with `harvest_mode: none_found`: the
register stays plain, no permission or reassurance line is invented (absence of warmth is acceptable;
imitation warmth is not), and the card carries a non-blocking flag so it can be revisited as the
corpus grows. New owner writing enriches the pool over time; it is never required to unblock work.
The only fail-closed case anywhere is editorial data completeness (for example, an aspect entry with
no human-moment beat), and that flags for editorial work - it never demands owner prose.

## Usage note for prompts

Lines are supplied to Codex or the writer as FOUNDATION, not verbatim inserts: "adapt each into its
article where it lands naturally, keeping its meaning and register, in collective voice." Verbatim is
allowed and preferred when the line already fits; stiff quotation is not the goal, her temperature is.

When `harvest_mode: none_found`, the packet still compiles. Keep the register plain and do not invent
permission, reassurance, benediction, or a turn-toward-the-reader line. The judge must not require one.

The separate aspect `humanMoment` field is editorial data completeness. Its absence may block a
complete aspect entry and create an editorial-work flag, but it never demands new owner prose.
