// Generated from canonical voice policy JSON. Do not edit by hand.
export const WRITING_POLICY_DATA = Object.freeze({
  "wordPolicies": [
    {
      "term": "death",
      "policyClass": "WAIVED",
      "reason": "Fully waived by owner ruling; no finding and no retrieval exclusion."
    },
    {
      "term": "die",
      "policyClass": "WAIVED",
      "reason": "Fully waived by owner ruling; no finding and no retrieval exclusion."
    },
    {
      "term": "dying",
      "policyClass": "WAIVED",
      "reason": "Fully waived by owner ruling; no finding and no retrieval exclusion."
    },
    {
      "term": "dynamic interplay",
      "policyClass": "HARD_BAN",
      "reason": "Generative-AI tell.",
      "useInstead": [
        "back and forth",
        "push and pull",
        "how they interact"
      ]
    },
    {
      "term": "performing normalcy",
      "policyClass": "HARD_BAN",
      "reason": "Banned phrasing.",
      "useInstead": [
        "pretending to be normal",
        "living inside someone else's design"
      ]
    },
    {
      "term": "permission slip",
      "policyClass": "HARD_BAN",
      "reason": "Banned phrasing.",
      "useInstead": [
        "permission",
        "choice",
        "opening"
      ]
    },
    {
      "term": "profound",
      "policyClass": "REPLACEMENT_SUGGESTION",
      "reason": "Prefer a more specific word such as significant, deep, lasting, major, strong, or important. Do not hard-ban; flag only when it is functioning as generic spiritual emphasis.",
      "contextPatterns": [
        "\\bprofound\\s+(?:change|effect|insight|connection|loss|influence|realization|shift)\\b"
      ],
      "useInstead": [
        "significant",
        "deep",
        "lasting",
        "major",
        "strong",
        "important"
      ]
    },
    {
      "term": "reckoning",
      "policyClass": "HARD_BAN",
      "reason": "Overused dramatic reveal language.",
      "useInstead": [
        "accounting",
        "clarifying moment",
        "honest review",
        "turning point"
      ]
    },
    {
      "term": "running tally",
      "policyClass": "HARD_BAN",
      "reason": "Tired, old phrasing (owner flag, 2026-07-25).",
      "useInstead": [
        "keeps track of",
        "keeps count of",
        "notices"
      ]
    },
    {
      "term": "self-erasure",
      "policyClass": "EDITORIAL_REVIEW",
      "reason": "Editorial style flag; owner-approved exact sentences may use it.",
      "useInstead": [
        "self-abandonment",
        "betraying your needs",
        "disappearing inside someone else's needs"
      ]
    },
    {
      "term": "self-punishment",
      "policyClass": "WAIVED",
      "reason": "Fully waived by owner ruling; no finding and no retrieval exclusion."
    },
    {
      "term": "tapestry",
      "policyClass": "AI_TELL_PREVENTIVE",
      "reason": "Overused metaphor.",
      "useInstead": [
        "pattern",
        "structure",
        "story"
      ]
    },
    {
      "term": "truth bomb",
      "policyClass": "HARD_BAN",
      "reason": "Banned phrasing.",
      "useInstead": [
        "hard truth",
        "clear truth",
        "direct truth"
      ]
    },
    {
      "term": "voice shakes",
      "policyClass": "WAIVED",
      "reason": "Literal speech description is allowed; repeated dramatic use belongs to cadence review."
    },
    {
      "term": "weave",
      "policyClass": "AI_TELL_PREVENTIVE",
      "literalContextPatterns": [
        "\\bweav(?:e|es|ed|ing)\\s+(?:the\\s+|a\\s+|an\\s+)?(?:fabric|cloth|textile|threads?|yarn|fibers?|basket|rug|carpet|garment)\\b",
        "\\b(?:loom|weaver|weavers)\\b[^.!?]{0,80}\\bweav(?:e|es|ed|ing)\\b"
      ],
      "reason": "Overused metaphor.",
      "useInstead": [
        "connect",
        "build",
        "bring together"
      ]
    },
    {
      "term": "whisper",
      "policyClass": "AI_TELL_PREVENTIVE",
      "reason": "Overused mystical softness.",
      "useInstead": [
        "signal",
        "quiet cue",
        "subtle pull"
      ]
    },
    {
      "term": "woven",
      "policyClass": "AI_TELL_PREVENTIVE",
      "literalContextPatterns": [
        "\\bwoven\\s+(?:fabric|cloth|textile|basket|rug|carpet|garment)\\b",
        "\\b(?:fabric|cloth|textile|basket|rug|carpet|garment)\\b[^.!?]{0,40}\\b(?:is|was|has been|had been)?\\s*woven\\b"
      ],
      "reason": "Overused metaphor.",
      "useInstead": [
        "connected",
        "built",
        "held together"
      ]
    }
  ],
  "bannedWords": [
    "audit",
    "colonize",
    "compound",
    "dynamic interplay",
    "ledger",
    "performing normalcy",
    "permission slip",
    "reckoning",
    "running tally",
    "truth bomb"
  ],
  "bannedPhrases": [
    "(aka ...)",
    "Great question.",
    "Let's dive into what the stars have in store",
    "This challenge is actually preparing you for",
    "Welcome to another powerful week",
    "What feels like limitation is really liberation",
    "You just need to take the next inspired step",
    "attachment wound",
    "consider that perhaps",
    "divine timing",
    "em dashes",
    "emotional safety",
    "everything happens for a reason",
    "gentle reminder",
    "healing journey",
    "high vibes only",
    "highest self",
    "hold space",
    "honor your journey",
    "inner child",
    "karmic contract",
    "let's unpack this",
    "love and light",
    "nervous system activation",
    "not as punishment, but as foundation",
    "reassurance",
    "regulate your nervous system",
    "sacred container",
    "sit with that",
    "surrender to the universe",
    "the universe is asking you to",
    "the version of you who already has it",
    "this is an opportunity to",
    "this transit invites you to",
    "trauma response",
    "trust the process"
  ]
});
