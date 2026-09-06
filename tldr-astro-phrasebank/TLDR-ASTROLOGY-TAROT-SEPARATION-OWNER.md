# TLDR Astro Astrology / Tarot Separation

**Status:** OWNER APPROVED  
**Owner approval date:** 2026-09-06

## Content boundary

TLDR Astro astrology content must not use tarot as an interpretive framework.

Reader-facing astrology copy may not reference tarot cards, the Major or Minor Arcana, tarot correspondences, tarot symbolism, or use a tarot card to explain the meaning of a sign, planet, house, aspect, transit, lunation, node, angle, or other astrological factor.

This applies across natal interpretations, transits, Daily and Weekly, Sky Calendar, lunations, houses, signs, planets, aspects, nodes, angles, Friends copy, and generated or fallback astrology copy.

Tarot is **not globally prohibited**. If TLDR Astro later contains an explicitly designated Tarot section or Tarot content type, tarot terminology and card interpretations are permitted there. Mixed astrology/tarot interpretation fails closed unless a separate mixed surface receives explicit owner approval.

## Validation semantics

Validation is content-type aware, not a global banned-word list:

- `astrology` -> tarot references fail reader eligibility.
- `tarot` -> tarot references are permitted.
- `mixed` -> fail by default; serving requires explicit exact owner approval for the mixed boundary.

Words such as `card`, `Tower`, or `Moon` are not independently prohibited. The gate should detect explicit tarot language and card/correspondence context so ordinary astrology or ordinary-language uses do not false-positive.

## Legacy migration rule

The historical lunation/book corpus may retain tarot material as source history and possible future Tarot-section material. Do not delete that source material, and do not blank the entire legacy lunation surface in one migration. New or explicitly classified astrology copy is subject to the boundary immediately; known live legacy violations enter the gate as they are repaired.

## Virgo New Moon / Gemini Rising correction

For `authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-gemini/house-4`, remove the astrology-to-Tarot correspondence and Chariot interpretation. The following replacement paragraph is exact owner-approved astrology copy:

> All relationships require give and take, and this New Moon can make it easier to see where the balance at home has become uneven. You may realize that you need more privacy, more help, a different division of responsibility, or simply a home that works better for the life you are living now. If something about your living situation or family dynamic has been bothering you for a while, this is a good time to stop treating it as background noise and decide what actually needs to change.

The surrounding already-approved Virgo New Moon / Gemini Rising astrology copy remains unchanged except for the replacement of the Tarot-correspondence block by the paragraph above.
