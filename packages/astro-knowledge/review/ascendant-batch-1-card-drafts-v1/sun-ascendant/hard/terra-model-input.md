You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Ascendant, hard
DIRECTION: {{holder1}} is the Sun holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their sense of identity, confidence, and direction press against how freely you present yourself and enter situations.
summaryDeep: Their sense of identity, confidence, and direction press against how freely you present yourself and enter situations. It catches often enough that you both feel it, and it keeps asking to be worked out. Name it directly instead of letting it build in silence.
APPROVED HUMAN-MOMENT INPUT: Around {{holder1}}, {{holder2}} may feel that {{holder1}} decides the tone and direction, so {{holder2}} works harder to make their own personality and choices clear.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "pisces-season-2025",
    "originalLine": "Read my Gift Guide in Forbes You've likely felt exhausted, emotionally raw, or stuck in old wounds you thought you had already healed.",
    "suppliedLine": "Read my Gift Guide in Forbes You've likely felt exhausted, emotionally raw, or stuck in old wounds you thought you had already healed."
  },
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "Here’s how to approach your finances with clarity and resilience, even when everything around you might feels unstable.",
    "suppliedLine": "Here’s how to approach your finances with clarity and resilience, even when everything around you might feels unstable."
  },
  {
    "sourceArticleId": "first-new-moon-of-2025-aquarius-new-moon",
    "originalLine": "If you’ve felt stuck or hesitant to make bold moves, this planetary shift will push you into action.",
    "suppliedLine": "If you’ve felt stuck or hesitant to make bold moves, this planetary shift will push you into action."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You often set the tone or direction before {{holder2}} has had room to show how they want to come across. They may explain their choices more firmly or push back, which can lead you to press your point again. Repeating that pattern can leave them feeling crowded out and you feeling challenged. If they have felt stuck or hesitant to make bold moves, this friction can push them into action.",
  "body_they": "{{holder1}} often sets the tone or direction before you have had room to show how you want to come across. You may explain your choices more firmly or push back, which can lead them to press their point again. Repeating that pattern can leave you feeling crowded out and them feeling challenged. If you have felt stuck or hesitant to make bold moves, this friction can push you into action.",
  "warmthSource": {
    "sourceArticleId": "first-new-moon-of-2025-aquarius-new-moon",
    "originalLine": "If you’ve felt stuck or hesitant to make bold moves, this planetary shift will push you into action.",
    "usedForm": {
      "body_you": "If they have felt stuck or hesitant to make bold moves, this friction can push them into action.",
      "body_they": "If you have felt stuck or hesitant to make bold moves, this friction can push you into action."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "sun-ascendant-hard",
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
    "readerIsPlanetHolder": "You often set the tone or direction before Bird has had room to show how they want to come across. They may explain their choices more firmly or push back, which can lead you to press your point again. Repeating that pattern can leave them feeling crowded out and you feeling challenged. If they have felt stuck or hesitant to make bold moves, this friction can push them into action.",
    "readerIsAscendantHolder": "Bird often sets the tone or direction before you have had room to show how you want to come across. You may explain your choices more firmly or push back, which can lead them to press their point again. Repeating that pattern can leave you feeling crowded out and them feeling challenged. If you have felt stuck or hesitant to make bold moves, this friction can push you into action."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Sun holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The hard behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
