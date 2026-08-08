You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Venus, conjunction
DIRECTION: {{holder1}} is the Sun holder. {{holder2}} is the Venus holder. The Sun holder acts on the Venus holder's affection, preferences, and way of caring.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Warm, affectionate, naturally drawn together. The Venus person adores the Sun person; the Sun person feels appreciated and seen. One of the gentlest attraction contacts. Failure mode: pleasant but passive - lots of warmth, little drive. Enjoy the affection, and make sure something supplies the momentum.
summaryDeep: You find them actually lovely, and being around them feels warm and easy. Affection and admiration flow, sometimes tipping into idealizing them. Enjoy the warmth and still see them clearly.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} genuinely admires who {{holder1}} is, and {{holder1}} thrives on that warmth. The risk comes when {{holder1}} starts relying on that approval to feel valid.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "total-lunar-eclipse-in-virgo",
    "originalLine": "If your financial situation feels unstable, if your sense of worth has been tied to external validation, if the structures that once made you feel safe now feel like constraints, this is where the illusion falls apart.",
    "suppliedLine": "If your financial situation feels unstable, if your sense of worth has been tied to external validation, if the structures that once made you feel safe now feel like constraints, this is where the illusion falls apart."
  },
  {
    "sourceArticleId": "full-moon-eclipse-in-pisces-2025",
    "originalLine": "Incomplete without your intuition that bridges the seen and unseen.",
    "suppliedLine": "Incomplete without your intuition that bridges the seen and unseen."
  },
  {
    "sourceArticleId": "full-moon-eclipse-in-pisces-2025",
    "originalLine": "To be seen not just for our dreams but for our willingness to feel everything so deeply.",
    "suppliedLine": "To be seen not just for our dreams but for our willingness to feel everything so deeply."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "{{holder2}} shows affection by praising who you are, and you become more open and expressive in response. Your sense of worth can become tied to external validation when their praise starts determining how good you feel about yourself. The affection between you feels warm, gentle, and easy to return.",
  "body_they": "You show affection by praising who {{holder1}} is, and {{holder1}} becomes more open and expressive in response. {{holder1}}'s sense of worth can become tied to external validation when your praise starts determining how good they feel about themselves. The affection between you feels warm, gentle, and easy to return.",
  "warmthSource": {
    "sourceArticleId": "total-lunar-eclipse-in-virgo",
    "originalLine": "If your financial situation feels unstable, if your sense of worth has been tied to external validation, if the structures that once made you feel safe now feel like constraints, this is where the illusion falls apart.",
    "usedForm": {
      "body_you": "Your sense of worth can become tied to external validation when their praise starts determining how good you feel about yourself.",
      "body_they": "{{holder1}}'s sense of worth can become tied to external validation when your praise starts determining how good they feel about themselves."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "sun-venus-conjunction",
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
    "sourceArticleId": "total-lunar-eclipse-in-virgo"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}