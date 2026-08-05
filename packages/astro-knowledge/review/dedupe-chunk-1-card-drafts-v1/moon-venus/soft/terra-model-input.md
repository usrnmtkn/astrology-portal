You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Venus, soft
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Venus holder. The Moon holder acts on the Venus holder's affection, preferences, and way of caring.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Care and affection flow naturally. Emotional comfort, kindness, a soothing bond. Failure mode: comfort without challenge. A beautiful foundation; keep some edge alive.
summaryDeep: Your feelings and their affection line up in a low-pressure way. Warmth is there when either of you reaches for it. Reach for it; it's freely given here.
APPROVED HUMAN-MOMENT INPUT: Support moves back and forth without friction, making the relationship inherently grounding and easy to return to.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "pisces-season-2025",
    "originalLine": "Read my Gift Guide in Forbes You've likely felt exhausted, emotionally raw, or stuck in old wounds you thought you had already healed.",
    "suppliedLine": "Read my Gift Guide in Forbes You've likely felt exhausted, emotionally raw, or stuck in old wounds you thought you had already healed."
  },
  {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "You might feel emotionally attached to old friendships that no longer support your growth.",
    "suppliedLine": "You might feel emotionally attached to old friendships that no longer support your growth."
  },
  {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "Success without love is just sophisticated loneliness.",
    "suppliedLine": "Success without love is just sophisticated loneliness."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "When {{holder2}} shows care or shares what feels good to them, you soften and respond with warmth, which makes it easier for {{holder2}} to keep showing affection. The ease between you can let difficult differences go unspoken because staying comfortable feels simpler than challenging each other. Even then, kindness is easy to reach for, and support moves back and forth without much friction.",
  "body_they": "When you show care or share what feels good to you, {{holder1}} softens and responds with warmth, which makes it easier for you to keep showing affection. The ease between you can let difficult differences go unspoken because staying comfortable feels simpler than challenging each other. Even then, kindness is easy to reach for, and support moves back and forth without much friction.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "moon-venus-soft",
  "passed": true,
  "exactOutputShape": {
    "passed": true
  },
  "sentenceCount_body_you": {
    "passed": true,
    "n": 3
  },
  "noDashes_body_you": {
    "passed": true
  },
  "asciiPunctuation_body_you": {
    "passed": true
  },
  "sentenceCount_body_they": {
    "passed": true,
    "n": 3
  },
  "noDashes_body_they": {
    "passed": true
  },
  "asciiPunctuation_body_they": {
    "passed": true
  },
  "rowDirection_body_you": {
    "passed": true
  },
  "rowDirection_body_they": {
    "passed": true
  },
  "exclusions_body_you": {
    "passed": true
  },
  "exclusions_body_they": {
    "passed": true
  },
  "warmthRecord": {
    "passed": true,
    "mode": "matched",
    "note": "matched packet, writer chose no warmth line; Terra scores the choice"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}