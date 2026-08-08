You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Mercury -> Venus, conjunction
DIRECTION: {{holder1}} is the Mercury holder. {{holder2}} is the Venus holder. The Mercury holder acts on the Venus holder's affection, preferences, and way of caring.
GOVERNED SOURCE BOUNDARY:
plainTranslation: A's mind meets B's love and values. The conjunction fuses them - intense and inseparable.
summaryDeep: Their questions, explanations, and way of talking sit right on top of your affections, tastes, and sense of worth. This is one of the closest contacts between you, strong and constant, energizing at its best and a lot to hold at its worst. Let the closeness feed you without letting it run you.
APPROVED HUMAN-MOMENT INPUT: {{holder1}}'s style of talking and {{holder2}}'s style of showing love fit tightly together, so every conversation feels like a small form of affection.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together.",
    "suppliedLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together."
  },
  {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "We don't have to choose between being loved and being ourselves.",
    "suppliedLine": "We don't have to choose between being loved and being ourselves."
  },
  {
    "sourceArticleId": "leo-full-moon-2025",
    "originalLine": "Something unresolved in love, in money, in worth is calling for review.",
    "suppliedLine": "Something unresolved in love, in money, in worth is calling for review."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "Your way of talking fits tightly with how {{holder2}} shows love, so they often hear your questions and explanations as affection and answer with more warmth. That response keeps you talking, but when you press a point or explain too much, {{holder2}} can feel that their preferences or worth are being picked apart, which can make you talk even more. We don't have to choose between being loved and being ourselves.",
  "body_they": "{{holder1}}'s way of talking fits tightly with how you show love, so you often hear their questions and explanations as affection and answer with more warmth. Your response keeps {{holder1}} talking, but when they press a point or explain too much, you can feel that your preferences or worth are being picked apart, which can make them talk even more. We don't have to choose between being loved and being ourselves.",
  "warmthSource": {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "We don't have to choose between being loved and being ourselves.",
    "usedForm": {
      "body_you": "We don't have to choose between being loved and being ourselves.",
      "body_they": "We don't have to choose between being loved and being ourselves."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "mercury-venus-conjunction",
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
    "sourceArticleId": "full-moon-in-aries"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}