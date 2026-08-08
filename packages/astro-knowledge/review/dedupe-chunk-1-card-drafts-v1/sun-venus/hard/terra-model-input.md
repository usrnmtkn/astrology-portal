You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Venus, hard
DIRECTION: {{holder1}} is the Sun holder. {{holder2}} is the Venus holder. The Sun holder acts on the Venus holder's affection, preferences, and way of caring.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Affection slightly off-key. The Venus person's way of loving doesn't quite match what the Sun person wants to be appreciated for. Failure mode: small, persistent feelings of being unseen. Adjust how you show appreciation - a tuning problem, not a dealbreaker.
summaryDeep: What you want to be and what they find lovely don't quite match. Affection is there but the taste or the timing is off. Say what actually pleases you instead of guessing.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} offers affection in a language that misses what {{holder1}} actually wants to be validated for. Nobody is in the wrong, but the slight mismatch keeps creating friction.
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
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough.",
    "suppliedLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "{{holder2}} tends to show affection by praising qualities they value, but those are not always the parts of you that you most want recognized. When you seem disappointed or pull back, {{holder2}} may try harder in the same way, leaving you feeling unseen and them confused about why their care does not land. Even so, {{holder2}} is trying to care for you, not dismiss you.",
  "body_they": "You tend to show affection by praising qualities you value in {{holder1}}, but those are not always the parts that {{holder1}} most wants you to recognize. When {{holder1}} seems disappointed or pulls back, you may try harder in the same way, leaving {{holder1}} feeling unseen and you confused about why your care does not land. Even so, you are trying to care for {{holder1}}, not dismiss them.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "sun-venus-hard",
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