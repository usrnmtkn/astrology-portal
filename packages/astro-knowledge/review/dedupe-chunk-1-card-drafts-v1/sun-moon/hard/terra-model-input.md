You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Moon, hard
DIRECTION: {{holder1}} is the Sun holder. {{holder2}} is the Moon holder. The Sun holder acts on the Moon holder's feelings, needs, and sense of emotional safety.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Core friction between identity and emotional need. What one wants to be grates on what the other needs to feel safe. Workable, not doom; many lasting couples carry it. Failure mode: reading the friction as proof you're wrong for each other. Name the specific clash and keep negotiating - this aspect rewards patience.
summaryDeep: Their direction and your needs keep pulling different ways. Their confidence can unsettle your comfort. Name what you need out loud instead of quietly adjusting around them.
APPROVED HUMAN-MOMENT INPUT: What {{holder1}} is striving to build can rub against what {{holder2}} needs to feel secure, keeping both people braced for impact without entirely knowing why.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "summer-solstice",
    "originalLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support.",
    "suppliedLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support."
  },
  {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "The ones who don't need you to be smaller so they can feel secure.",
    "suppliedLine": "The ones who don't need you to be smaller so they can feel secure."
  },
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "When everything around you feels chaotic or heavy, it can be tempting to put your needs on hold or dismiss the importance of care.",
    "suppliedLine": "When everything around you feels chaotic or heavy, it can be tempting to put your needs on hold or dismiss the importance of care."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "When you push ahead with what you want to build, {{holder2}} can feel that their need for reassurance or rest is getting in your way. They may go quiet and adjust around you, which leaves them tense and leaves you unsure why they are pulling back. There is room for what you are building and for what {{holder2}} needs, without either of you becoming smaller so the other can feel secure.",
  "body_they": "When {{holder1}} pushes ahead with what they want to build, you can feel that your need for reassurance or rest is getting in their way. You may go quiet and adjust around them, which leaves you tense and leaves {{holder1}} unsure why you are pulling back. There is room for what {{holder1}} is building and for what you need, without either of you becoming smaller so the other can feel secure.",
  "warmthSource": {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "The ones who don't need you to be smaller so they can feel secure.",
    "usedForm": {
      "body_you": "There is room for what you are building and for what {{holder2}} needs, without either of you becoming smaller so the other can feel secure.",
      "body_they": "There is room for what {{holder1}} is building and for what you need, without either of you becoming smaller so the other can feel secure."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "sun-moon-hard",
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