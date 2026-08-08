You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Mars, conjunction
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Mars holder. The Moon holder acts on the Mars holder's drive, pace, and way of acting.
GOVERNED SOURCE BOUNDARY:
plainTranslation: A's feelings meets B's drive. The conjunction fuses them - intense and inseparable.
summaryDeep: Their drive lands on your feelings, exciting and occasionally abrasive. Passion and irritation run close together. Move the heat before it becomes a fight about feelings.
APPROVED HUMAN-MOMENT INPUT: {{holder1}}'s feelings and {{holder2}}'s reactions hit at the exact same moment. Things get brutally honest fast, and overheated just as quickly.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "It reminds us that emotional honesty is the first form of resistance, and that safety cannot exist where truth is unwelcome.",
    "suppliedLine": "It reminds us that emotional honesty is the first form of resistance, and that safety cannot exist where truth is unwelcome."
  },
  {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "Here's permission you might need: you're allowed to sit with problems instead of immediately seeking solutions.",
    "suppliedLine": "Here's permission you might need: you're allowed to sit with problems instead of immediately seeking solutions."
  },
  {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "Here's permission you might need: you're allowed to be affected by emotions.",
    "suppliedLine": "Here's permission you might need: you're allowed to be affected by emotions."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "When {{holder2}} acts quickly or reacts sharply, you feel it immediately, and your emotional response pushes them to act again. The exchange gets honest fast, but passion and irritation can become a fight about what you feel before either of you slows down. You're allowed to be affected by emotions.",
  "body_they": "When you act quickly or react sharply, {{holder1}} feels it immediately, and their emotional response pushes you to act again. The exchange gets honest fast, but passion and irritation can become a fight about what {{holder1}} feels before either of you slows down. {{holder1}} is allowed to be affected by emotions.",
  "warmthSource": {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "Here's permission you might need: you're allowed to be affected by emotions.",
    "usedForm": {
      "body_you": "You're allowed to be affected by emotions.",
      "body_they": "{{holder1}} is allowed to be affected by emotions."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "moon-mars-conjunction",
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
    "sourceArticleId": "libra-season-autumn-equinox"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}