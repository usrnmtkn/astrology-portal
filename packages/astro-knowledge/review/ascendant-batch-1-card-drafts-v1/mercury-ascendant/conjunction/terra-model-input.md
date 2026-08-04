You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Mercury -> Ascendant, conjunction
DIRECTION: {{holder1}} is the Mercury holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their questions, explanations, and way of talking sit right on top of how freely you present yourself and enter situations.
summaryDeep: Their questions, explanations, and way of talking sit right on top of how freely you present yourself and enter situations. This is one of the closest contacts between you, strong and constant, energizing at its best and a lot to hold at its worst. Let the closeness feed you without letting it run you.
APPROVED HUMAN-MOMENT INPUT: What {{holder1}} says about {{holder2}} can quickly shape how {{holder2}} sees themselves and how they choose to present themselves.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "You've probably gotten better at setting some boundaries with family expectations, but there are still situations where you automatically take on more responsibility than feels fair.",
    "suppliedLine": "You've probably gotten better at setting some boundaries with family expectations, but there are still situations where you automatically take on more responsibility than feels fair."
  },
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "It reminds us that emotional honesty is the first form of resistance, and that safety cannot exist where truth is unwelcome.",
    "suppliedLine": "It reminds us that emotional honesty is the first form of resistance, and that safety cannot exist where truth is unwelcome."
  },
  {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "Give yourself permission to have feelings about other people's situations without being responsible for fixing them.",
    "suppliedLine": "Give yourself permission to have feelings about other people's situations without being responsible for fixing them."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You quickly notice how {{holder2}} introduces themselves, starts conversations, or approaches a situation, and you tend to ask questions or explain what you see. {{holder2}} may immediately adjust their tone or behavior in response, which gives you more to react to. That close back-and-forth can be lively, but repeated questions or comments can make them second-guess how they come across. You can have feelings about how {{holder2}} handles a situation without being responsible for fixing it.",
  "body_they": "{{holder1}} quickly notices how you introduce yourself, start conversations, or approach a situation, and they tend to ask questions or explain what they see. You may immediately adjust your tone or behavior in response, which gives {{holder1}} more to react to. That close back-and-forth can be lively, but repeated questions or comments can make you second-guess how you come across. {{holder1}} can have feelings about how you handle a situation without being responsible for fixing it.",
  "warmthSource": {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "Give yourself permission to have feelings about other people's situations without being responsible for fixing them.",
    "usedForm": {
      "body_you": "You can have feelings about how {{holder2}} handles a situation without being responsible for fixing it.",
      "body_they": "{{holder1}} can have feelings about how you handle a situation without being responsible for fixing it."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "mercury-ascendant-conjunction",
  "nonemptyFields": true,
  "exactOutputShape": true,
  "sentenceCount": {
    "passed": true,
    "body_you": 4,
    "body_they": 4
  },
  "rowDirection": {
    "passed": true,
    "body_you": true,
    "body_they": true
  },
  "placeholders": {
    "passed": true,
    "found": [
      "{{holder2}}",
      "{{holder1}}"
    ]
  },
  "punctuation": {
    "passed": true,
    "prohibitedMatch": null
  },
  "stockCloser": {
    "passed": true,
    "match": null
  },
  "excludedClaims": {
    "passed": true,
    "match": null
  },
  "advice": {
    "passed": true,
    "match": null
  },
  "warmthProvenance": {
    "passed": true,
    "harvestMode": "matched",
    "reason": "Used foundation line has complete exact provenance."
  },
  "preview": {
    "readerIsPlanetHolder": "You quickly notice how Bird introduces themselves, starts conversations, or approaches a situation, and you tend to ask questions or explain what you see. Bird may immediately adjust their tone or behavior in response, which gives you more to react to. That close back-and-forth can be lively, but repeated questions or comments can make them second-guess how they come across. You can have feelings about how Bird handles a situation without being responsible for fixing it.",
    "readerIsAscendantHolder": "Bird quickly notices how you introduce yourself, start conversations, or approach a situation, and they tend to ask questions or explain what they see. You may immediately adjust your tone or behavior in response, which gives Bird more to react to. That close back-and-forth can be lively, but repeated questions or comments can make you second-guess how you come across. Bird can have feelings about how you handle a situation without being responsible for fixing it."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Mercury holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The conjunction behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
