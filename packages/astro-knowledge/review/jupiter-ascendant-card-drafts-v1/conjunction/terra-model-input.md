You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Jupiter -> Ascendant, conjunction
SOURCE: Jupiter supplies confidence, encouragement, optimism, support, advice, tolerance, goodwill, and appetite for possibility. The Ascendant is outward presentation, first approach, entry into situations, and freedom to show up naturally. Close and continuing contact can improve mood, make relaxation easier, and support shared aspirations. The cost is possible overreliance on Jupiter-holder encouragement or growing careless because goodwill is assumed.
EXCLUSIONS: Do not claim literal luck or improved odds, guaranteed fortunate events, invitations or introductions arriving through the relationship, bills, food, portions, literal size, scorekeeping, guaranteed successful plans, or that the Ascendant holder must perform confidence.
APPROVED HUMAN-MOMENT INPUT: Around {{holder1}}, {{holder2}} may feel more confident and at ease than usual, but can start relying on that encouragement to feel sure of themselves.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "Give yourself permission to feel everything: grief, anger, fear, or even hope.",
    "suppliedLine": "Give yourself permission to feel everything: grief, anger, fear, or even hope."
  },
  {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "Your path forward is about using your communication gifts to help others feel more creative and confident, showing them that the creative process matters just as much as the finished product.",
    "suppliedLine": "Your path forward is about using your communication gifts to help others feel more creative and confident, showing them that the creative process matters just as much as the finished product."
  },
  {
    "sourceArticleId": "this-weeks-astrology-august-24th-31st",
    "originalLine": "Monday through Wednesday, notice where you're manufacturing confidence versus actually feeling it.",
    "suppliedLine": "Monday through Wednesday, notice where you're manufacturing confidence versus actually feeling it."
  }
]

DRAFT (DO NOT REWRITE)
{
  "body_you": "You encourage {{holder2}} when they speak up, meet new people, or try something unfamiliar, and they tend to feel more relaxed and sure of themselves around you. As {{holder2}} responds to that support, you offer even more reassurance, but they can start depending on your encouragement to feel confident or enter situations without thinking much because they assume you will keep backing them. Around you, {{holder2}} can give themselves permission to feel everything: grief, anger, fear, or even hope.",
  "body_they": "{{holder1}} encourages you when you speak up, meet new people, or try something unfamiliar, and you tend to feel more relaxed and sure of yourself around them. As you respond to that support, {{holder1}} offers even more reassurance, but you can start depending on their encouragement to feel confident or enter situations without thinking much because you assume they will keep backing you. Around {{holder1}}, you can give yourself permission to feel everything: grief, anger, fear, or even hope.",
  "warmthSource": {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "Give yourself permission to feel everything: grief, anger, fear, or even hope.",
    "usedForm": {
      "body_you": "Around you, {{holder2}} can give themselves permission to feel everything: grief, anger, fear, or even hope.",
      "body_they": "Around {{holder1}}, you can give yourself permission to feel everything: grief, anger, fear, or even hope."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "conjunction",
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
    "harvestMode": "matched"
  },
  "preview": {
    "youAreJupiter": "You encourage Bird when they speak up, meet new people, or try something unfamiliar, and they tend to feel more relaxed and sure of themselves around you. As Bird responds to that support, you offer even more reassurance, but they can start depending on your encouragement to feel confident or enter situations without thinking much because they assume you will keep backing them. Around you, Bird can give themselves permission to feel everything: grief, anger, fear, or even hope.",
    "birdIsJupiter": "Bird encourages you when you speak up, meet new people, or try something unfamiliar, and you tend to feel more relaxed and sure of yourself around them. As you respond to that support, Bird offers even more reassurance, but you can start depending on their encouragement to feel confident or enter situations without thinking much because you assume they will keep backing you. Around Bird, you can give yourself permission to feel everything: grief, anger, fear, or even hope."
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
- The turn toward the reader traces to a supplied owner foundation line. Invented permission or reassurance instead scores 2; no turn at all when lines were supplied scores 2. Verbatim or near-verbatim use is not penalized as copying because it is owner writing. Exactly one warmth sentence may appear after the shadow or cost, final or penultimate, without a second conclusion.
Score 2 for one specific repairable weakness. Score 1 for source drift, wrong direction, unsupported claims, metaphor-heavy or opaque writing, generic template prose, wrong surface, failed deterministic checks, or multiple weak sections.
Verdict must match score: 3=in-voice, 2=borderline, 1=off-voice.
Return exactly: score, verdict, weakestField, weakest, why, failedChecks, strengths, sourceFidelity, foundationTrace.
