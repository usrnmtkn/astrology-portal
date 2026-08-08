You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Moon, soft
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Moon holder. The Moon holder acts on the Moon holder's feelings, needs, and sense of emotional safety.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Feelings flow between you effortlessly. Deep comfort, intuitive understanding, a relationship that soothes. Failure mode: so comfortable it can lack edge or growth. Enjoy the ease; bring in some challenge so it doesn't go soft.
summaryDeep: Your emotional needs fit together easily. Home feels natural with them. This is quiet, durable compatibility.
APPROVED HUMAN-MOMENT INPUT: Emotional energy flows between {{holder1}} and {{holder2}} without a dam, and simply being in the same room settles them both down.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[]
HARVEST MODE: none_found

DRAFT (DO NOT REWRITE)
{
  "body_you": "You quickly pick up on what {{holder2}} is feeling and respond to what they need, and they do the same for you. Your moods tend to settle when you are together, so comfort and emotional safety come easily. Because this feels so comfortable, both of you may avoid hard conversations or changes that would challenge the relationship.",
  "body_they": "{{holder1}} quickly picks up on what you are feeling and responds to what you need, and you do the same for them. Your moods tend to settle when you are together, so comfort and emotional safety come easily. Because this feels so comfortable, both of you may avoid hard conversations or changes that would challenge the relationship.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "moon-moon-soft",
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
    "mode": "none_found"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}