You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Venus -> Ascendant, conjunction
DIRECTION: {{holder1}} is the Venus holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their affection, preferences, and wish to keep things pleasant sit right on top of how freely you present yourself and enter situations.
summaryDeep: Their affection, preferences, and wish to keep things pleasant sit right on top of how freely you present yourself and enter situations. This is one of the closest contacts between you, strong and constant, energizing at its best and a lot to hold at its worst. Let the closeness feed you without letting it run you.
APPROVED HUMAN-MOMENT INPUT: {{holder1}} makes {{holder2}} feel liked and accepted, but {{holder2}} may start changing small parts of themselves to keep that approval.
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
  "body_you": "Your affection makes {{holder2}} feel liked and accepted when they show up as themselves, and they quickly notice what seems to please you. Because your response matters so much, they may start changing their manner or appearance to keep your approval, until presenting themselves freely feels harder. Your affection can also help them feel valued without tying their worth to external validation.",
  "body_they": "{{holder1}}'s affection makes you feel liked and accepted when you show up as yourself, and you quickly notice what seems to please them. Because their response matters so much, you may start changing your manner or appearance to keep their approval, until presenting yourself freely feels harder. Their affection can also help you feel valued without tying your worth to external validation.",
  "warmthSource": {
    "sourceArticleId": "total-lunar-eclipse-in-virgo",
    "originalLine": "If your financial situation feels unstable, if your sense of worth has been tied to external validation, if the structures that once made you feel safe now feel like constraints, this is where the illusion falls apart.",
    "usedForm": {
      "body_you": "Your affection can also help them feel valued without tying their worth to external validation.",
      "body_they": "Their affection can also help you feel valued without tying your worth to external validation."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "venus-ascendant-conjunction",
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
    "readerIsPlanetHolder": "Your affection makes Bird feel liked and accepted when they show up as themselves, and they quickly notice what seems to please you. Because your response matters so much, they may start changing their manner or appearance to keep your approval, until presenting themselves freely feels harder. Your affection can also help them feel valued without tying their worth to external validation.",
    "readerIsAscendantHolder": "Bird's affection makes you feel liked and accepted when you show up as yourself, and you quickly notice what seems to please them. Because their response matters so much, you may start changing your manner or appearance to keep their approval, until presenting yourself freely feels harder. Their affection can also help you feel valued without tying your worth to external validation."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Venus holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The conjunction behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
