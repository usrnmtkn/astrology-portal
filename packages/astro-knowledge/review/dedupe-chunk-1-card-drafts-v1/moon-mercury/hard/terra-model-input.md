You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Mercury, hard
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Mercury holder. The Moon holder acts on the Mercury holder's thinking and way of talking.
GOVERNED SOURCE BOUNDARY:
plainTranslation: A's feelings meets B's mind. The square puts them in friction.
summaryDeep: Their moods, needs, and habits of comfort press against your thinking and how you talk and decide. It catches often enough that you both feel it, and it keeps asking to be worked out. Name it directly instead of letting it build in silence.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} reaches for logic and explanations when {{holder1}} just wants company in a feeling, leaving {{holder1}} feeling dissected instead of supported.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
    "suppliedLine": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know."
  },
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "You might feel the urge to rework how you earn, save, or spend.",
    "suppliedLine": "You might feel the urge to rework how you earn, save, or spend."
  },
  {
    "sourceArticleId": "full-moon-in-taurus",
    "originalLine": "Your body knows the difference between joy and productive joy, you can feel it in how you hold yourself when creating for approval versus creating for pleasure.",
    "suppliedLine": "Your body knows the difference between joy and productive joy, you can feel it in how you hold yourself when creating for approval versus creating for pleasure."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "When you want {{holder2}} to stay with you in a feeling, your need for comfort presses on how they think and talk. They reach for logic, questions, or explanations, and you can feel dissected instead of supported, so you keep asking for emotional company while they keep trying to make sense of it. When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
  "body_they": "When {{holder1}} wants you to stay with them in a feeling, their need for comfort presses on how you think and talk. You reach for logic, questions, or explanations, and they can feel dissected instead of supported, so they keep asking for emotional company while you keep trying to make sense of it. When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
  "warmthSource": {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
    "usedForm": {
      "body_you": "When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know.",
      "body_they": "When the ground beneath you feels unstable, it's natural to want to hold tightly to what you know."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "moon-mercury-hard",
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
    "sourceArticleId": "aquarius-season-2025"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}