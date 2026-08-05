You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Ascendant, conjunction
DIRECTION: {{holder1}} is the Moon holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their moods, needs, and habits of comfort sit right on top of how freely you present yourself and enter situations.
summaryDeep: Their moods, needs, and habits of comfort sit right on top of how freely you present yourself and enter situations. This is one of the closest contacts between you, strong and constant, energizing at its best and a lot to hold at its worst. Let the closeness feed you without letting it run you.
APPROVED HUMAN-MOMENT INPUT: {{holder1}} notices {{holder2}}'s mood almost immediately, which can feel comforting when {{holder2}} wants to be understood and exposing when {{holder2}} wants privacy.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
    "suppliedLine": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know."
  },
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "You might feel the urge to rework how you earn, save, or spend.",
    "suppliedLine": "You might feel the urge to rework how you earn, save, or spend."
  },
  {
    "sourceArticleId": "full-moon-in-taurus",
    "originalLine": "Your body knows the difference between joy and productive joy, you can feel it in how you hold yourself when creating for approval versus creating for pleasure.",
    "suppliedLine": "Your body knows the difference between joy and productive joy, you can feel it in how you hold yourself when creating for approval versus creating for pleasure."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You notice {{holder2}}'s mood almost immediately, and your own mood and need for comfort affect how freely they act around you. When they want to be understood, your quick response can feel comforting, and they may relax into being themselves. When they want privacy, the same attention can feel exposing, and they may hold back as soon as they sense your reaction. When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
  "body_they": "{{holder1}} notices your mood almost immediately, and their own mood and need for comfort affect how freely you act around them. When you want to be understood, their quick response can feel comforting, and you may relax into being yourself. When you want privacy, the same attention can feel exposing, and you may hold back as soon as you sense their reaction. When the ground beneath {{holder1}} feels unstable, it’s natural for them to want to hold tightly to what they know.",
  "warmthSource": {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
    "usedForm": {
      "body_you": "When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
      "body_they": "When the ground beneath {{holder1}} feels unstable, it’s natural for them to want to hold tightly to what they know."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "moon-ascendant-conjunction",
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
    "readerIsPlanetHolder": "You notice Bird's mood almost immediately, and your own mood and need for comfort affect how freely they act around you. When they want to be understood, your quick response can feel comforting, and they may relax into being themselves. When they want privacy, the same attention can feel exposing, and they may hold back as soon as they sense your reaction. When the ground beneath you feels unstable, it’s natural to want to hold tightly to what you know.",
    "readerIsAscendantHolder": "Bird notices your mood almost immediately, and their own mood and need for comfort affect how freely you act around them. When you want to be understood, their quick response can feel comforting, and you may relax into being yourself. When you want privacy, the same attention can feel exposing, and you may hold back as soon as you sense their reaction. When the ground beneath Bird feels unstable, it’s natural for them to want to hold tightly to what they know."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Moon holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The conjunction behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
