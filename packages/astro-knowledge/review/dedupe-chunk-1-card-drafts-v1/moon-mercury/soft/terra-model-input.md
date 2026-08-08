You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Mercury, soft
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Mercury holder. The Moon holder acts on the Mercury holder's thinking and way of talking.
GOVERNED SOURCE BOUNDARY:
plainTranslation: A's feelings meets B's mind. The trine lets them flow together easily.
summaryDeep: Their moods, needs, and habits of comfort work smoothly with your thinking and how you talk and decide. It runs easily and asks little, quietly steadying the rest of the bond. Lean on how naturally this one lines up.
APPROVED HUMAN-MOMENT INPUT: {{holder1}} can voice raw feelings without polishing them first, and {{holder2}} tracks the emotion without turning it into a debate.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "TLDR-Article-Edition-Jupiter-Cancer-2025-OWNER",
    "originalLine": "Give yourself the silence needed to hear the voice beneath the noise.",
    "suppliedLine": "Give yourself the silence needed to hear the voice beneath the noise."
  },
  {
    "sourceArticleId": "TLDR-Article-Edition-Uranus-Rx-Gemini-2025-OWNER",
    "originalLine": "By healing your own emotional patterns, you help heal the collective's relationship with feeling.",
    "suppliedLine": "By healing your own emotional patterns, you help heal the collective's relationship with feeling."
  },
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together.",
    "suppliedLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You can tell {{holder2}} what you feel before you have sorted it into careful words. {{holder2}} usually follows the emotion behind what you say and responds without turning it into a debate. This ease can leave some details unspoken because you both assume the meaning is already clear. Even so, being understood without polishing every feeling brings a quiet steadiness between you.",
  "body_they": "{{holder1}} can tell you what they feel before they have sorted it into careful words. You usually follow the emotion behind what they say and respond without turning it into a debate. This ease can leave some details unspoken because you both assume the meaning is already clear. Even so, understanding {{holder1}} without requiring every feeling to be polished brings a quiet steadiness between you.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "moon-mercury-soft",
  "passed": true,
  "exactOutputShape": {
    "passed": true
  },
  "sentenceCount_body_you": {
    "passed": true,
    "n": 4
  },
  "noDashes_body_you": {
    "passed": true
  },
  "asciiPunctuation_body_you": {
    "passed": true
  },
  "sentenceCount_body_they": {
    "passed": true,
    "n": 4
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