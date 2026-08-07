You are writing one original TLDR Astro Current Sky fallback article.

Read the six attached owner-authored Marie Satori passages before writing. They establish sentence register and paragraph movement. The verified astrology establishes the placement's meaning and limits.

Create one recognizable lived sequence from the verified astrology. Use ordinary current language. Name the pressure, what someone does, and what changes because of it. The scene may be invented; the astrology may not.

Write one continuous article for the supplied fallback contract. The app supplies the headline, fact line, dates, and any approved aspect insert. Keep one central tension across every paragraph. Opening shows ordinary evidence. Tension names how the same strength creates a cost. Development continues that exact problem through practical choices. Close names one realistic choice before {{exitDate}}. Try this contains two or three specific actions that do not repeat the close.

Preserve the supplied surface contract, facts, output fields, and applicable hard constraints. Do not copy or analyze the owner passages. Do not return options, commentary, a source map, or a style explanation.

Return only strict JSON with exactly these keys: opening, tension, development, close, try_this. Use the literal {{entryDate}} in opening and {{exitDate}} in close. The try_this value must be an array of two or three one-sentence strings. Stop after the final action.

Use collective language. Do not use people, you, your, yours, yourself, or yourselves. Use we, someone, a named group, or the actual subject.

VERIFIED ASTROLOGY
{
  "planetFunction": "Jupiter describes growth, wisdom, opportunity, belief, generosity, risk, confidence, and the instinct to expand beyond what is already known. It shows where someone seeks meaning, trusts possibility, and learns through experience.",
  "signExpression": "With Jupiter in Capricorn, it rewards patience, discipline, and ambition. You can find success through hard work, good organization, and the pursuit of long-term goals. Your leadership skills and business acumen are enhanced, often leading to professional growth.",
  "combinedMeaning": "Jupiter in Capricorn: you grow through discipline, ambition, and patient building. Luck comes via responsibility and the long game. Watch: pessimism limiting your reach.",
  "collectiveGift": "Jupiter in Capricorn: you grow through discipline, ambition, and patient building",
  "observableShadowBehaviors": [
    "pessimism limiting your reach"
  ],
  "timing": "Jupiter takes about twelve years to move through the zodiac and spends about one year in each sign. Its sign describes the style of growth; its house shows where opportunity, perspective, and excess can become visible.",
  "supportedDomains": [],
  "unsupportedDomainWarnings": [
    "Do not introduce a domain or consequence that is absent from the verified sources."
  ],
  "scenarioPolicy": "The writer may create one original lived sequence by combining the governed planet and sign meanings inside the supported domains. The scene may be invented; the astrology may not.",
  "sourcePassages": [
    {
      "sourcePath": "packages/astro-knowledge/data/placements/sign/jupiter-capricorn.json",
      "status": "REVIEWED",
      "text": "Jupiter in Capricorn: you grow through discipline, ambition, and patient building. Luck comes via responsibility and the long game. Watch: pessimism limiting your reach."
    },
    {
      "sourcePath": "packages/astro-knowledge/data/planetary/jupiter.json",
      "status": "REVIEWED",
      "text": "Jupiter describes growth, wisdom, opportunity, belief, generosity, risk, confidence, and the instinct to expand beyond what is already known. It shows where someone seeks meaning, trusts possibility, and learns through experience. Jupiter takes about twelve years to move through the zodiac and spends about one year in each sign. Its sign describes the style of growth; its house shows where opportunity, perspective, and excess can become visible. With Jupiter in Capricorn, it rewards patience, discipline, and ambition. You can find success through hard work, good organization, and the pursuit of long-term goals. Your leadership skills and business acumen are enhanced, often leading to professional growth."
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
  "runtimeContractId": "sky-placement-continuous-v2",
  "compiledPolicySource": "voice/tldr-astro/marie-satori-editorial-decisions.yaml",
  "compiledPolicySha256": "80422f8a8795c13c691562396b37fc199c31f4f07dfe0f0fdd170c17d901f92b",
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
      "id": "CF-018",
      "scope": {
        "surfaces": [
          "all-editorial-copy"
        ]
      },
      "rule": "Do not use leak, leaks, leaked, or leaking in Marie Satori editorial copy. Name the observable action or consequence instead."
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
    "opening",
    "tension",
    "development",
    "close",
    "try_this"
  ],
  "engineOwnedSlots": [
    "headline",
    "fact_line",
    "aspect_insert",
    "entryDate",
    "exitDate"
  ],
  "slotRequirements": {
    "opening": "One paragraph showing recognizable ordinary evidence. Include the literal {{entryDate}} slot once. Do not define the planet or sign generically.",
    "tension": "One paragraph naming one central tension and showing how the same useful behavior creates a cost when pushed too far.",
    "development": "One practical paragraph that continues the same tension through specific choices. Do not introduce a new theme.",
    "close": "One sentence naming one realistic choice. Include the literal {{exitDate}} slot once. No slogan, reassurance, or second conclusion.",
    "try_this": "Two actions by default, or three only when the third adds something different. Each action must be possible this week and specific to the placement."
  },
  "assembly": {
    "factLine": "{{entryDate}} to {{exitDate}}",
    "aspectInsert": "{{aspectInsert}}",
    "bodyOrder": [
      "opening",
      "tension",
      "development",
      "aspect_insert",
      "close",
      "try_this"
    ],
    "targetWordsWithoutAspect": "220-350"
  },
  "requestedBeat": "full_article",
  "emphasisBeat": "turn",
  "beatRequirement": "Follow the complete Sky Placement article contract.",
  "pace": "about a year"
}

EXACT TASK
Write one complete continuous Current Sky fallback article for Jupiter in Capricorn. Create one recognizable lived sequence from the verified astrology. Return only opening, tension, development, close, and try_this.

OWNER PASSAGE 1
We're living through the collapse of information systems that once provided stability. Media literacy isn't enough anymore when the boundary between authentic and artificial keeps shifting. Social networks that promised connection deliver isolation. Search engines that promised knowledge deliver manipulation.

OWNER PASSAGE 2
If job loss or work instability is part of what's happening, the anxiety about money makes rest almost impossible. This Full Moon illuminates the cost of running on stress hormones and calling it productivity.

OWNER PASSAGE 3
Now, we are in another period of upheaval. The old ways of earning, spending, and saving are becoming obsolete. Cryptocurrency challenges traditional banking.

OWNER PASSAGE 4
Power dynamics in relationships become obvious. Who makes the decisions? Who always gives in? Who holds the emotional cards? These patterns need to be seen before they can be changed.

OWNER PASSAGE 5
This transit brings a sense of urgency, a need to say what’s been left unsaid, a push to initiate conversations that might otherwise linger too long in the background. But urgency is not always clarity. Sometimes it’s just heat, just impulse, just reaction. Mercury in Aries is a powerful tool when wielded with intention, but when left unchecked, it can ignite arguments, burn bridges, and speak truths that aren’t totally fully formed yet.

OWNER PASSAGE 6
Say it out loud. Then say the opposite. Notice which one feels like freedom, even if it also feels scary.
