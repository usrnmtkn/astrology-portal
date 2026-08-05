You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Saturn -> Ascendant, conjunction
DIRECTION: {{holder1}} is the Saturn holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their standards affect how freely you show up around them.
summaryDeep: Their standards affect how freely you show up around them. They can help you get serious or make you self-conscious. Take the steadiness; don't make yourself smaller to fit their gravity.
APPROVED HUMAN-MOMENT INPUT: {{holder1}}'s standards make {{holder2}} more aware of how they act, but {{holder2}} may start holding parts of themselves back to avoid criticism.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "new-moon-solar-eclipse-in-virgo",
    "originalLine": "Question those impossibly high standards that leave you feeling like a failure.",
    "suppliedLine": "Question those impossibly high standards that leave you feeling like a failure."
  },
  {
    "sourceArticleId": "full-moon-in-aries",
    "originalLine": "Pay attention to the difference between being genuinely helpful and being helpful because you're afraid of being seen as selfish or inadequate.",
    "suppliedLine": "Pay attention to the difference between being genuinely helpful and being helpful because you're afraid of being seen as selfish or inadequate."
  },
  {
    "sourceArticleId": "full-moon-in-taurus",
    "originalLine": "Consider whether there are resources available that you've been rejecting because accepting help feels like failure.",
    "suppliedLine": "Consider whether there are resources available that you've been rejecting because accepting help feels like failure."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You may point out {{holder2}}'s tone, reactions, or way of entering a situation when these do not meet your standards. They may start monitoring themselves and holding back parts of their personality to avoid your criticism. Your standards can help {{holder2}} take themselves seriously when they are not so high that {{holder2}} feels like a failure.",
  "body_they": "{{holder1}} may point out your tone, reactions, or way of entering a situation when these do not meet their standards. You may start monitoring yourself and holding back parts of your personality to avoid their criticism. Their standards can help you take yourself seriously when they are not so high that you feel like a failure.",
  "warmthSource": {
    "sourceArticleId": "new-moon-solar-eclipse-in-virgo",
    "originalLine": "Question those impossibly high standards that leave you feeling like a failure.",
    "usedForm": {
      "body_you": "Your standards can help {{holder2}} take themselves seriously when they are not so high that {{holder2}} feels like a failure.",
      "body_they": "Their standards can help you take yourself seriously when they are not so high that you feel like a failure."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "saturn-ascendant-conjunction",
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
    "readerIsPlanetHolder": "You may point out Bird's tone, reactions, or way of entering a situation when these do not meet your standards. They may start monitoring themselves and holding back parts of their personality to avoid your criticism. Your standards can help Bird take themselves seriously when they are not so high that Bird feels like a failure.",
    "readerIsAscendantHolder": "Bird may point out your tone, reactions, or way of entering a situation when these do not meet their standards. You may start monitoring yourself and holding back parts of your personality to avoid their criticism. Their standards can help you take yourself seriously when they are not so high that you feel like a failure."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Saturn holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the governed source boundary. The card does not invent events, scenarios, outcomes, advice, or excluded claims.
- The conjunction behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when behavior and cost are clear, with no second conclusion.
- When supplied owner foundation lines are present, any turn toward the reader must trace to one of them. An invented permission or reassurance line scores 2. No turn at all also scores 2, unless the draft simply stops after clear behavior and cost and the owner-facing record makes that absence explicit. Verbatim or near-verbatim owner wording is never penalized as copying. At most one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
