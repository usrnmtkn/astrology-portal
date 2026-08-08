You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Moon, soft
DIRECTION: {{holder1}} is the Sun holder. {{holder2}} is the Moon holder. The Sun holder acts on the Moon holder's feelings, needs, and sense of emotional safety.
GOVERNED SOURCE BOUNDARY:
plainTranslation: A natural, easy fit between who one is and what the other needs. Drives and feelings sync; the relationship feels like home fast. Failure mode: comfort breeds passivity. Stay awake in it - easy compatibility still needs effort to become something.
summaryDeep: Their sense of self and your feelings fit together comfortably. You feel safe being yourself around them. This is real compatibility glue, so trust it.
APPROVED HUMAN-MOMENT INPUT: Being around {{holder1}} gives {{holder2}} an immediate sense of home, no explanations needed and nothing to prove.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "2025-overview",
    "originalLine": "It asks you to strip away the masks, the performances, the need to prove yourself.",
    "suppliedLine": "It asks you to strip away the masks, the performances, the need to prove yourself."
  },
  {
    "sourceArticleId": "leo-new-moon-2025",
    "originalLine": "If you've been burning yourself out trying to earn validation, this is a moment to stop and reassess.",
    "suppliedLine": "If you've been burning yourself out trying to earn validation, this is a moment to stop and reassess."
  },
  {
    "sourceArticleId": "sagittarius-full-moon-2025",
    "originalLine": "You don’t need to prove you’re worthy.",
    "suppliedLine": "You don’t need to prove you’re worthy."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "Your way of being puts {{holder2}} at ease, and they show you what they feel without much explanation. You respond naturally to their feelings, so closeness builds quickly. Because the fit feels easy, you can both become passive and stop showing care. Around you, {{holder2}} does not need to prove they are worthy.",
  "body_they": "{{holder1}}'s way of being puts you at ease, and you show them what you feel without much explanation. They respond naturally to your feelings, so closeness builds quickly. Because the fit feels easy, you can both become passive and stop showing care. Around {{holder1}}, you do not need to prove you are worthy.",
  "warmthSource": {
    "sourceArticleId": "sagittarius-full-moon-2025",
    "originalLine": "You don’t need to prove you’re worthy.",
    "usedForm": {
      "body_you": "Around you, {{holder2}} does not need to prove they are worthy.",
      "body_they": "Around {{holder1}}, you do not need to prove you are worthy."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "sun-moon-soft",
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
    "sourceArticleId": "sagittarius-full-moon-2025"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}