You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Neptune -> Ascendant, hard
DIRECTION: {{holder1}} is the Neptune holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their dreaminess and blurred edges land on how you show up, so it's not always clear how they actually see you.
summaryDeep: Their dreaminess and blurred edges land on how you show up, so it's not always clear how they actually see you. You can feel idealized or quietly misread, admired for a version of you that isn't quite real. Ask for the clear read instead of performing the image they project onto you.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} cannot always tell what {{holder1}} really thinks of them, so {{holder2}} may start watching for approval and changing how they act to keep it.
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
  "body_you": "You may admire a version of {{holder2}} that fits your hopes, and {{holder2}} may not be able to tell what you actually think of them. {{holder2}} may respond by becoming more careful around you and adjusting how they come across based on whether you seem pleased, which can leave them feeling unseen. They want to be seen not just for their dreams but for their willingness to feel everything so deeply.",
  "body_they": "{{holder1}} may admire a version of you that fits their hopes, and you may not be able to tell what they actually think of you. You may respond by becoming more careful around {{holder1}} and adjusting how you come across based on whether they seem pleased, which can leave you feeling unseen. You want to be seen not just for your dreams but for your willingness to feel everything so deeply.",
  "warmthSource": {
    "usedForm": {
      "body_you": "They want to be seen not just for their dreams but for their willingness to feel everything so deeply.",
      "body_they": "You want to be seen not just for your dreams but for your willingness to feel everything so deeply."
    },
    "sourceArticleId": "full-moon-eclipse-in-pisces-2025",
    "originalLine": "To be seen not just for our dreams but for our willingness to feel everything so deeply."
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "neptune-ascendant-hard",
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
    "sourceArticleId": "full-moon-eclipse-in-pisces-2025"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}