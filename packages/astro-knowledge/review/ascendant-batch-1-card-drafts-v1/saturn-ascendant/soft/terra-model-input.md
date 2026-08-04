You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Saturn -> Ascendant, soft
DIRECTION: {{holder1}} is the Saturn holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their standards, caution, and sense of responsibility work smoothly with how freely you present yourself and enter situations.
summaryDeep: Their standards, caution, and sense of responsibility work smoothly with how freely you present yourself and enter situations. It runs easily and asks little, quietly steadying the rest of the bond. Lean on how naturally this one lines up.
APPROVED HUMAN-MOMENT INPUT: {{holder1}} is consistent and takes {{holder2}} seriously, which helps {{holder2}} feel comfortable enough to be themselves without proving anything first.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough.",
    "suppliedLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough."
  },
  {
    "sourceArticleId": "new-moon-solar-eclipse-in-virgo",
    "originalLine": "You've likely been stuck in what I call the perfection prison - that exhausting belief that if you could just get organized enough, productive enough, or helpful enough, you'd finally earn the right to rest.",
    "suppliedLine": "You've likely been stuck in what I call the perfection prison - that exhausting belief that if you could just get organized enough, productive enough, or helpful enough, you'd finally earn the right to rest."
  },
  {
    "sourceArticleId": "virgo-new-moon-august-23rd-2025",
    "originalLine": "You're exhausted from trying to perfect a life you're too tired to actually enjoy.",
    "suppliedLine": "You're exhausted from trying to perfect a life you're too tired to actually enjoy."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You respond consistently to how {{holder2}} speaks, acts, and enters new situations, so they know you take them seriously. Your standards can still make them pause and check how they are coming across. You appreciate {{holder2}}'s authenticity instead of making them feel like they're too much or not enough.",
  "body_they": "{{holder1}} responds consistently to how you speak, act, and enter new situations, so you know they take you seriously. Their standards can still make you pause and check how you are coming across. {{holder1}} appreciates your authenticity instead of making you feel like you're too much or not enough.",
  "warmthSource": {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "The right friends will appreciate your authenticity; the wrong ones will make you feel like you're too much or not enough.",
    "usedForm": {
      "body_you": "You appreciate {{holder2}}'s authenticity instead of making them feel like they're too much or not enough.",
      "body_they": "{{holder1}} appreciates your authenticity instead of making you feel like you're too much or not enough."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "saturn-ascendant-soft",
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
    "readerIsPlanetHolder": "You respond consistently to how Bird speaks, acts, and enters new situations, so they know you take them seriously. Your standards can still make them pause and check how they are coming across. You appreciate Bird's authenticity instead of making them feel like they're too much or not enough.",
    "readerIsAscendantHolder": "Bird responds consistently to how you speak, act, and enter new situations, so you know they take you seriously. Their standards can still make you pause and check how you are coming across. Bird appreciates your authenticity instead of making you feel like you're too much or not enough."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Saturn holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The soft behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
