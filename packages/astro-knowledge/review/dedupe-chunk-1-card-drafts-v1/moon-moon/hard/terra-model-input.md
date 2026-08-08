You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Moon, hard
DIRECTION: {{holder1}} is the Moon holder. {{holder2}} is the Moon holder. The Moon holder acts on the Moon holder's feelings, needs, and sense of emotional safety.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Your emotional needs clash at the root. You both feel strongly but in incompatible ways - what soothes one unsettles the other. Failure mode: two reactive people triggering each other with no neutral ground. Learn each other's actual needs instead of assuming yours apply; this one takes translation work.
summaryDeep: Your emotional needs and habits keep missing each other. What soothes one of you unsettles the other. Learn each other's actual comfort, not the one you'd assume.
APPROVED HUMAN-MOMENT INPUT: What settles {{holder1}}'s nervous system actively rattles {{holder2}}'s, and vice versa. Both feel deeply, and both keep getting thrown when comfort fails to translate.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "monthly-overview-june-2025",
    "originalLine": "Over the next year, you're being asked to redefine what security actually feels like, and build a relationship to money that’s rooted in care, not anxiety.",
    "suppliedLine": "Over the next year, you're being asked to redefine what security actually feels like, and build a relationship to money that’s rooted in care, not anxiety."
  },
  {
    "sourceArticleId": "2025-new-and-full-moons",
    "originalLine": "This is a time to honor what makes you feel secure, to savor what nourishes you, and to set intentions for the kind of abundance that lasts.",
    "suppliedLine": "This is a time to honor what makes you feel secure, to savor what nourishes you, and to set intentions for the kind of abundance that lasts."
  },
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "But the deeper work lies in redefining what makes you feel secure.",
    "suppliedLine": "But the deeper work lies in redefining what makes you feel secure."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "What helps you feel settled often unsettles {{holder2}}, and {{holder2}}'s way of seeking comfort can make you feel just as unsafe. You both react from that discomfort, so each attempt to feel understood can trigger another defensive response and leave neither of you feeling cared for. Together, the deeper work lies in redefining what makes each of you feel secure.",
  "body_they": "What helps {{holder1}} feel settled often unsettles you, and your way of seeking comfort can make {{holder1}} feel just as unsafe. You both react from that discomfort, so each attempt to feel understood can trigger another defensive response and leave neither of you feeling cared for. Together, the deeper work lies in redefining what makes each of you feel secure.",
  "warmthSource": {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "But the deeper work lies in redefining what makes you feel secure.",
    "usedForm": {
      "body_you": "Together, the deeper work lies in redefining what makes each of you feel secure.",
      "body_they": "Together, the deeper work lies in redefining what makes each of you feel secure."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "moon-moon-hard",
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
    "sourceArticleId": "cancer-new-moon-2025"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}