You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Moon -> Ascendant, hard
DIRECTION: {{holder1}} is the Moon holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their moods, needs, and habits of comfort press against how freely you present yourself and enter situations.
summaryDeep: Their moods, needs, and habits of comfort press against how freely you present yourself and enter situations. It catches often enough that you both feel it, and it keeps asking to be worked out. Name it directly instead of letting it build in silence.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} may start watching {{holder1}}'s mood and changing how they act to prevent tension before anything has even happened.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "aquarius-season-2025",
    "originalLine": "Whether it’s rearranging your physical space, mending family dynamics, or redefining what home means to you, trust in the process of breaking free from what has felt confining.",
    "suppliedLine": "Whether it’s rearranging your physical space, mending family dynamics, or redefining what home means to you, trust in the process of breaking free from what has felt confining."
  },
  {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "Notice when you automatically step in to fix family problems, when you feel responsible for other people's choices or emotions, or when you sacrifice your own needs to maintain family peace.",
    "suppliedLine": "Notice when you automatically step in to fix family problems, when you feel responsible for other people's choices or emotions, or when you sacrifice your own needs to maintain family peace."
  },
  {
    "sourceArticleId": "leo-new-moon-2025",
    "originalLine": "The pressure to be what others expect is real, but so is your capacity to choose yourself.",
    "suppliedLine": "The pressure to be what others expect is real, but so is your capacity to choose yourself."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "Your moods and need for comfort can make {{holder2}} cautious about how they act around you. They may watch your reactions and change how they enter a situation to prevent tension before anything has even happened, which leaves them less free to be themselves. The pressure on {{holder2}} to be what you expect is real, but so is their capacity to choose themselves.",
  "body_they": "{{holder1}}'s moods and need for comfort can make you cautious about how you act around them. You may watch their reactions and change how you enter a situation to prevent tension before anything has even happened, which leaves you less free to be yourself. The pressure to be what they expect is real, but so is your capacity to choose yourself.",
  "warmthSource": {
    "sourceArticleId": "leo-new-moon-2025",
    "originalLine": "The pressure to be what others expect is real, but so is your capacity to choose yourself.",
    "usedForm": {
      "body_you": "The pressure on {{holder2}} to be what you expect is real, but so is their capacity to choose themselves.",
      "body_they": "The pressure to be what they expect is real, but so is your capacity to choose yourself."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "moon-ascendant-hard",
  "nonemptyFields": true,
  "exactOutputShape": true,
  "sentenceCount": {
    "passed": true,
    "body_you": 3,
    "body_they": 3
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
    "readerIsPlanetHolder": "Your moods and need for comfort can make Bird cautious about how they act around you. They may watch your reactions and change how they enter a situation to prevent tension before anything has even happened, which leaves them less free to be themselves. The pressure on Bird to be what you expect is real, but so is their capacity to choose themselves.",
    "readerIsAscendantHolder": "Bird's moods and need for comfort can make you cautious about how you act around them. You may watch their reactions and change how you enter a situation to prevent tension before anything has even happened, which leaves you less free to be yourself. The pressure to be what they expect is real, but so is your capacity to choose yourself."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Moon holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The hard behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
