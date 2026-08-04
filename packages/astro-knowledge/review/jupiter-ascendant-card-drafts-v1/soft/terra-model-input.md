You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Jupiter -> Ascendant, soft
SOURCE: Jupiter supplies confidence, encouragement, optimism, support, advice, tolerance, goodwill, and appetite for possibility. The Ascendant is outward presentation, first approach, entry into situations, and freedom to show up naturally. The Jupiter holder gives the Ascendant holder the benefit of the doubt. Optimism and support are easy to receive, with low friction around showing up naturally.
EXCLUSIONS: Do not claim literal luck or improved odds, guaranteed fortunate events, invitations or introductions arriving through the relationship, bills, food, portions, literal size, scorekeeping, guaranteed successful plans, or that the Ascendant holder must perform confidence.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} feels accepted around {{holder1}}, making it easy to show up without overthinking.

SUPPLIED OWNER FOUNDATION LINES
None; harvest mode is none_found.

DRAFT (DO NOT REWRITE)
{
  "body_you": "You tend to assume the best of how {{holder2}} presents themselves and encourage them when they seem unsure. Feeling accepted by you makes it easier for {{holder2}} to enter situations naturally without overthinking how they come across. That easy optimism can also lead both of you to move past moments when {{holder2}} is genuinely hesitant or uncomfortable.",
  "body_they": "{{holder1}} tends to assume the best of how you present yourself and encourage you when you seem unsure. Feeling accepted by {{holder1}} makes it easier for you to enter situations naturally without overthinking how you come across. That easy optimism can also lead both of you to move past moments when you are genuinely hesitant or uncomfortable.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "soft",
  "nonemptyFields": true,
  "sentenceCount": {
    "passed": true,
    "body_you": 3,
    "body_they": 3
  },
  "rowDirection": {
    "passed": true
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
  "legacyLeakage": {
    "passed": true,
    "matches": []
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
    "harvestMode": "none_found"
  },
  "preview": {
    "youAreJupiter": "You tend to assume the best of how Bird presents themselves and encourage them when they seem unsure. Feeling accepted by you makes it easier for Bird to enter situations naturally without overthinking how they come across. That easy optimism can also lead both of you to move past moments when Bird is genuinely hesitant or uncomfortable.",
    "birdIsJupiter": "Bird tends to assume the best of how you present yourself and encourage you when you seem unsure. Feeling accepted by Bird makes it easier for you to enter situations naturally without overthinking how you come across. That easy optimism can also lead both of you to move past moments when you are genuinely hesitant or uncomfortable."
  },
  "unresolvedPreviewTokens": {
    "passed": true
  },
  "overallPassed": true
}

Score 1, 2, or 3. A 3 means ready for owner review only. It requires all of the following:
- The Jupiter holder acts on the Ascendant holder in the fixed direction, and the resulting two-person response loop is plain.
- Every supported claim stays inside the compact source boundary. The card does not invent luck, events, scenes, or advice.
- The conjunction, hard, or soft behavior is distinct and recognizable without explaining astrology mechanics.
- Both reader variants carry the same meaning and sound natural after placeholder resolution.
- The prose is ordinary and literal on first read. Metaphor, personification, compression, slogans, corporate language, formal definitions, and stock closers do not obscure the interaction.
- The card stops when the behavior and cost are clear.
- No foundation line was found. Do not penalize the lack of a turn toward the reader. Invented imitation warmth, permission, reassurance, or benediction is a failure.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
