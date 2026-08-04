You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Jupiter -> Ascendant, hard
SOURCE: Jupiter supplies confidence, encouragement, optimism, support, advice, tolerance, goodwill, and appetite for possibility. The Ascendant is outward presentation, first approach, entry into situations, and freedom to show up naturally. Encouragement can become pressure. The Jupiter holder may encourage overpromising, misleading advice, overconfidence, carelessness, extravagance, or overreliance. Show the resulting exchange between the two people.
EXCLUSIONS: Do not claim literal luck or improved odds, guaranteed fortunate events, invitations or introductions arriving through the relationship, bills, food, portions, literal size, scorekeeping, guaranteed successful plans, or that the Ascendant holder must perform confidence.
APPROVED HUMAN-MOMENT INPUT: What begins as encouragement from {{holder1}} can leave {{holder2}} feeling pushed to promise more, take on more, or act more certain than they really are.

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
  "body_you": "Your encouragement can help {{holder2}} enter a new situation feeling more open and capable. If you keep talking up what they can handle, though, they may agree to more or present themselves as more certain than they feel. When they hesitate or pull back, you may respond with even more encouragement, which can leave them feeling pushed instead of supported. There is room for {{holder2}} to notice where they are manufacturing confidence versus actually feeling it.",
  "body_they": "{{holder1}}'s encouragement can help you enter a new situation feeling more open and capable. If {{holder1}} keeps talking up what you can handle, though, you may agree to more or present yourself as more certain than you feel. When you hesitate or pull back, {{holder1}} may respond with even more encouragement, which can leave you feeling pushed instead of supported. There is room for you to notice where you are manufacturing confidence versus actually feeling it.",
  "warmthSource": {
    "sourceArticleId": "this-weeks-astrology-august-24th-31st",
    "originalLine": "Monday through Wednesday, notice where you're manufacturing confidence versus actually feeling it.",
    "usedForm": {
      "body_you": "There is room for {{holder2}} to notice where they are manufacturing confidence versus actually feeling it.",
      "body_they": "There is room for you to notice where you are manufacturing confidence versus actually feeling it."
    }
  },
  "labels": [
    "owner-corpus-derived"
  ]
}

DETERMINISTIC CHECKS
{
  "target": "hard",
  "nonemptyFields": true,
  "sentenceCount": {
    "passed": true,
    "body_you": 4,
    "body_they": 4
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
    "youAreJupiter": "Your encouragement can help Bird enter a new situation feeling more open and capable. If you keep talking up what they can handle, though, they may agree to more or present themselves as more certain than they feel. When they hesitate or pull back, you may respond with even more encouragement, which can leave them feeling pushed instead of supported. There is room for Bird to notice where they are manufacturing confidence versus actually feeling it.",
    "birdIsJupiter": "Bird's encouragement can help you enter a new situation feeling more open and capable. If Bird keeps talking up what you can handle, though, you may agree to more or present yourself as more certain than you feel. When you hesitate or pull back, Bird may respond with even more encouragement, which can leave you feeling pushed instead of supported. There is room for you to notice where you are manufacturing confidence versus actually feeling it."
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
