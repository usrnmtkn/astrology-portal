You are writing one original TLDR Astro Current Sky article.

Read the six attached owner-authored Marie Satori passages before writing. They establish sentence register and paragraph movement. The verified astrology establishes the placement's meaning and limits.

Create one recognizable lived sequence from the verified astrology. Use ordinary current language. Name the pressure, what someone does, and what changes because of it. The scene may be invented; the astrology may not.

Preserve the supplied surface contract, facts, output fields, and applicable hard constraints. Do not copy or analyze the owner passages. Do not return options, commentary, a source map, or a style explanation.

Return only strict JSON with exactly these keys: tagline, hook, lived, turn, moves. Tagline must be one clear full sentence. The moves value must be an array of two or three one-sentence strings. Stop after the final move.

Use collective language. Do not use people, you, your, yours, yourself, or yourselves. Use we, someone, a named group, or the actual subject.

VERIFIED ASTROLOGY
{
  "planetFunction": "Jupiter describes growth, wisdom, opportunity, belief, generosity, risk, confidence, and the instinct to expand beyond what is already known. It shows where someone seeks meaning, trusts possibility, and learns through experience.",
  "signExpression": "If Jupiter is in Libra, you’re blessed with a keen sense of balance and diplomacy. Opportunities might abound in partnerships and social settings, and you’re likely to excel in situations that require compromise, negotiation, or artistic sense.",
  "combinedMeaning": "Jupiter in Libra: you grow through relationship, fairness, and beauty. Luck comes via partnership and diplomacy. Watch: indecision and over-accommodating.",
  "collectiveGift": "Growth and opportunity develop through fairness, partnership, diplomacy, compromise, negotiation, and artistic judgment.",
  "observableShadowBehaviors": [
    "indecision",
    "over-accommodating"
  ],
  "timing": "Jupiter takes about twelve years to move through the zodiac and spends about one year in each sign. Its sign describes the style of growth; its house shows where opportunity, perspective, and excess can become visible.",
  "supportedDomains": [
    "relationships",
    "partnerships",
    "social settings",
    "fairness",
    "diplomacy",
    "compromise",
    "negotiation",
    "artistic judgment",
    "beauty"
  ],
  "unsupportedDomainWarnings": [
    "Do not make career, work, money, credit, spending, travel, higher education, law, houses, or natal interpretation the article's main domain without another verified source."
  ],
  "scenarioPolicy": "The writer may create one original lived sequence by combining the governed planet and sign meanings inside the supported domains. The scene may be invented; the astrology may not.",
  "sourcePassages": [
    {
      "sourcePath": "packages/astro-knowledge/data/placements/sign/jupiter-libra.json",
      "status": "REVIEWED",
      "text": "Jupiter in Libra: you grow through relationship, fairness, and beauty. Luck comes via partnership and diplomacy. Watch: indecision and over-accommodating."
    },
    {
      "sourcePath": "packages/astro-knowledge/data/planetary/jupiter.json",
      "status": "REVIEWED",
      "text": "Jupiter describes growth, wisdom, opportunity, belief, generosity, risk, confidence, and the instinct to expand beyond what is already known. It shows where someone seeks meaning, trusts possibility, and learns through experience. Jupiter takes about twelve years to move through the zodiac and spends about one year in each sign. Its sign describes the style of growth; its house shows where opportunity, perspective, and excess can become visible. If Jupiter is in Libra, you’re blessed with a keen sense of balance and diplomacy. Opportunities might abound in partnerships and social settings, and you’re likely to excel in situations that require compromise, negotiation, or artistic sense."
    }
  ],
  "validation": {
    "complete": true,
    "failures": []
  }
}

SURFACE REQUIREMENTS
{
  "contractId": "tldr-astro.voice.sky-placement.v5",
  "compiledPolicySource": "voice/tldr-astro/marie-satori-editorial-decisions.yaml",
  "compiledPolicySha256": "797ca3821900fd9a3af5b4373e422157fc54d4a5fb4497e86677d3240f2653b7",
  "universalHardConstraints": [
    {
      "id": "ED-001",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Use ordinary, current language that makes literal sense when read aloud."
    },
    {
      "id": "ED-002",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Name the pressure, what someone does, and what changes because of it in one recognizable sequence."
    },
    {
      "id": "ED-003",
      "scope": {
        "surfaces": [
          "current-sky"
        ]
      },
      "rule": "Current Sky never uses you, your, yours, yourself, or yourselves; natal and transit-to-natal may use second person."
    },
    {
      "id": "ED-004",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Do not use em dashes."
    },
    {
      "id": "CF-001",
      "scope": {
        "prohibited": [
          "sky-placement"
        ],
        "conditional": [
          "all-other-surfaces"
        ]
      },
      "rule": "Do not use people in Sky Placement. On other surfaces, use it only when the collective itself is the real subject and a more exact subject would be less accurate."
    },
    {
      "id": "CF-013",
      "scope": {
        "surfaces": [
          "all-generated-copy"
        ]
      },
      "rule": "Person is allowed. Prohibit repetitive generic phrases such as one person when a more specific role, action, or subject is available."
    },
    {
      "id": "CF-014",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Looks good on paper is allowed as an ordinary idiom. Other uses of on paper require an actual written document; administrative put the plan on paper phrasing is prohibited."
    },
    {
      "id": "CF-004",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Room is allowed for a literal physical room. Prohibit stock audience or hierarchy phrases such as the loudest person in the room or the smartest voice in the room."
    },
    {
      "id": "CF-005",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Reserve harm and self-harm for literal harm. Do not substitute self-harm for broader language; otherwise name the specific behavior, loss, danger, or consequence."
    },
    {
      "id": "CF-015",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Steady is allowed for observable effort, pace, support, light, or reliability. Prohibit it only as vague energy language or an empty positive adjective."
    },
    {
      "id": "CF-002",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ]
      },
      "rule": "Perform, performed, and performance are allowed only for literal acting, music, presentations, or measurable job performance. Prohibit figurative uses about identity, normalcy, worth, emotion, belonging, or social behavior; Leo alone is not an exception."
    },
    {
      "id": "CF-003",
      "scope": {
        "surfaces": [
          "all-generated-copy"
        ],
        "literal_exceptions": [
          "an actual physical object is tilted"
        ]
      },
      "rule": "Do not use tilt or tilts as a figurative substitute for change. Literal physical tilting is allowed."
    },
    {
      "id": "CF-006",
      "scope": {
        "surfaces": [
          "sky-placement-tagline"
        ]
      },
      "rule": "A tagline must be a clear full sentence readers understand on first read. Strong is welcome; cryptic compression is not."
    },
    {
      "id": "ED-005",
      "scope": {
        "surfaces": [
          "all-editorial-copy"
        ]
      },
      "rule": "When the behavior and cost are clear, stop; delete a following slogan, metaphor, reassurance, or second conclusion."
    },
    {
      "id": "ED-006",
      "scope": {
        "surfaces": [
          "all-editorial-copy"
        ]
      },
      "rule": "Do not turn ordinary events into institutional, advocacy, therapy-workbook, or corporate-operations language unless the actual subject requires it."
    },
    {
      "id": "ED-007",
      "scope": {
        "surfaces": [
          "all-reader-copy"
        ],
        "literal_exceptions": [
          "physical mail is part of the source or scene"
        ]
      },
      "rule": "Use message, reply, response, or what they were told instead of letter or formal technical delivery terms unless physical mail matters."
    },
    {
      "id": "CF-016",
      "scope": {
        "surfaces": [
          "all-editorial-copy"
        ]
      },
      "rule": "Chani-adjacent warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are allowed. Documented adjacent-site constructions and advocacy-default subject matter are not."
    },
    {
      "id": "CF-007",
      "scope": {
        "surfaces": [
          "collective-astrology",
          "outer-planet-copy"
        ]
      },
      "rule": "Collective astrology does not default to campaigns, institutions, policy, organizing, public harm, or collective healing. Those subjects require direct astrological and owner-source support."
    },
    {
      "id": "ED-008",
      "scope": {
        "surfaces": [
          "all-astrology-copy"
        ]
      },
      "rule": "Do not infer a life domain from a sign alone. Taurus does not automatically mean work or career."
    },
    {
      "id": "ED-015",
      "scope": {
        "surfaces": [
          "sky-placement-tagline"
        ]
      },
      "rule": "Reject the swappable tagline construction [Planet] in [sign] helps us grow through [generic virtue or domain]. A tagline must tell the reader what is actually happening."
    },
    {
      "id": "ED-016",
      "scope": {
        "surfaces": [
          "all-generated-astrology-copy"
        ]
      },
      "rule": "Reject the stock gift-to-problem keyword flip: The gift becomes the problem when [positive keyword] turns into [negative keyword]. Show the observed sequence instead."
    },
    {
      "id": "ED-017",
      "scope": {
        "surfaces": [
          "ordinary-shared-decisions"
        ]
      },
      "rule": "For ordinary shared decisions, reject workshop, mediation, negotiation, and facilitation language unless the literal subject requires it. Name what someone wants, avoids saying, delays, and causes instead."
    },
    {
      "id": "ED-018",
      "scope": {
        "surfaces": [
          "sky-placement"
        ]
      },
      "rule": "Do not build a Sky Placement article around a low-stakes social plan merely because a sign suggests partnership. A social plan must expose a recognizable pressure with a meaningful consequence and cannot stage a perfectly balanced solution to prove the astrology."
    },
    {
      "id": "ED-019",
      "scope": {
        "surfaces": [
          "sky-placement"
        ]
      },
      "rule": "Reject generic fairness conclusions that explain a virtue instead of ending on the specific behavior and cost established by the article."
    },
    {
      "id": "ED-010",
      "scope": {
        "surfaces": [
          "app",
          "sky-editorial"
        ]
      },
      "rule": "Display time in the user's local timezone; computed dates, degrees, motion, and event times come from the engine rather than generated prose."
    }
  ],
  "person": "collective-current-sky",
  "secondPersonAllowed": false,
  "generatedSlots": [
    "tagline",
    "hook",
    "lived",
    "turn",
    "moves"
  ],
  "slotRequirements": {
    "hook": "2-4 sentences. Sentence 1 is the standalone recognition quote: a complete line someone would remember or send to a friend. The reader promotes it into a bold callout and removes it from the article body. Begin with a lived premise, not a slogan or abstract placement summary. The remaining sentences form the meaning paragraph: explain what the planet governs and how the sign changes its method, pace, or priorities. Translate meaning into natural prose and behavior, never a keyword list. Name the transit only after the human situation is clear when possible.",
    "lived": "What the planet-sign combination does in ordinary life. 2-4 sentences. Include the transit's pace (days, weeks, years, decades) somewhere in the article, usually here. Concrete evidence INVENTED FRESH for this placement - the kind of thing a reader would recognize from their own week. Build movement from pressure to choice to consequence. Do not line up three representative examples from work, family, relationships, or public life as if completing a coverage checklist; concrete nouns do not rescue a flat inventory. One charged sequence beats three interchangeable scenarios. (The spec's classic illustrations - unsent message, corrected coffee order, overfilled calendar - are teaching examples and BANNED in output; they leaked into every card of the first batch.) Explain the planet through behavior, never through a keyword list.",
    "turn": "Name where the gift becomes the problem and end with a clean truth. 2-5 sentences. The shadow must be observable behavior, not an abstract warning. Name the exact cost: the delayed conversation, cancelled plan, overspending, overwork, one-sided agreement, or other source-supported consequence. A directive is allowed when it is specific. End on the strongest plain sentence; no dramatic metaphor, second aphorism, blessing, or soft summary after it.",
    "tagline": "One clear full sentence rendered under the article title, normally 6-18 words. It must make sense on first read rather than compressing the article into a cryptic slogan.",
    "moves": "2-3 concrete ways to work with the transit, one sentence each, rendered as a short list after the turn. Each move must be specific enough to fail on the wrong placement."
  },
  "requestedBeat": "full_article",
  "emphasisBeat": "turn",
  "beatRequirement": "Follow the complete Sky Placement article contract.",
  "pace": "about a year"
}

EXACT TASK
Write one complete Current Sky Sky Placement article for Jupiter in Libra, with particular attention to the turn.

OWNER PASSAGE 1
Pressure rises and we tighten up. For about two and a half days, everything gets weighed against the plan. The Moon gets serious here, and so do we.

OWNER PASSAGE 2
The old doubt about being allowed to go first gets loud again. Chiron in Aries presses on the right to want things, take up space, and act without attaching a written apology.

OWNER PASSAGE 3
Feelings get translated into tasks: make the list, keep the promise, handle the thing before it becomes a problem. Competence feels comforting, but it can also become armor. We stay busy enough to avoid admitting that something hurts.

OWNER PASSAGE 4
Chiron sits in a sign for years, so a whole generation carries this tender spot together. We see it in whose anger is allowed, who gets called selfish, and what happens when somebody finally stops asking permission.

OWNER PASSAGE 5
Scorpio feelings want the truth, but they will settle for control when the truth feels too exposed. Say the raw thing and it clears. Hold it in and it leaks out sideways, aimed at whoever is closest.

OWNER PASSAGE 6
Do one useful thing for someone without correcting how they receive it. Before buying, name the daily problem the purchase will actually solve. Ask what support would help instead of deciding for the other person.
