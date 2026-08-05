You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Venus, hard
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Venus holder. The Moon holder acts on the Venus holder's affection, preferences, and way of caring.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Affection and emotional need slightly at odds. What the Venus person offers isn't quite what the Moon person needs to feel cared for. Failure mode: a recurring sense of being loved in the wrong language. Learn the other's actual needs - workable and worth it.
summaryDeep: What you need and what they value pull slightly apart. Affection and comfort are a little crossed. Ask for the specific comfort instead of the grand gesture.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} offers care the only way they know how, but it keeps missing what {{holder1}} needs to feel secure. Both keep trying, and both keep feeling slightly unseen.
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
    "sourceArticleId": "summer-solstice",
    "originalLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support.",
    "suppliedLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support."
  },
  {
    "sourceArticleId": "libra-season-autumn-equinox",
    "originalLine": "The ones who don't need you to be smaller so they can feel secure.",
    "suppliedLine": "The ones who don't need you to be smaller so they can feel secure."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "When {{holder2}} shows affection in the way that feels natural to them, you may respond with hurt or distance because it does not give you the reassurance you need. They may then try harder in the same way, so you still feel uncared for and they feel rejected. Both of you are trying to care, even when neither feels fully understood.",
  "body_they": "When you show affection in the way that feels natural to you, {{holder1}} may respond with hurt or distance because it does not give them the reassurance they need. You may then try harder in the same way, so {{holder1}} still feels uncared for and you feel rejected. Both of you are trying to care, even when neither feels fully understood.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "moon-venus-hard",
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