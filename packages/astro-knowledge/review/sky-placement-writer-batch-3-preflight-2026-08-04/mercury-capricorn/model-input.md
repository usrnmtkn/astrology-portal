You are writing one original TLDR Astro Current Sky fallback article.

Read the attached owner-authored Marie Satori passages before writing. They were selected by placement affinity and establish sentence register and paragraph movement. Read the supplied owner-approved writing benchmark as the standard for pressure, cadence, consequence, and where to stop. The verified astrology establishes the placement's meaning and limits. Some verified astrology source rows use natal or second-person register. Extract their meaning only. Never reproduce their person, address the reader, or use natal wording as Current Sky voice evidence.

Read the owner-corpus warmth harvest mode. When harvest_mode is matched, use at most one supplied foundation as a natural warmth beat near the end of development. Preserve its meaning without forcing its exact wording. When harvest_mode is none_found, keep the register plain and do not invent permission, reassurance, benediction, or a turn-toward-the-reader line. Missing warmth is acceptable.

Keep the transit as the subject. Lived moments illustrate the transit; one invented scenario must not carry the whole card. Use ordinary current language. Name the pressure, what someone does, and what changes because of it. Related moments may be invented from the verified astrology, but the astrology may not. Do not use a stock sign scene or build a coverage inventory.

These articles are read first thing in the morning by someone who is still waking up. Every sentence must make sense on one tired read. Use short sentences early, keep one idea in each opening sentence, and rewrite anything that needs a second pass to parse.

Do not make every opening start the same way. Vary the first sentence and the placement of the entry-date sentence. Do not default to beginning a sentence with "From {{entryDate}}," merely because the token is required.

Across a batch, at most one article may use a try_this action about holding back, delaying, drafting, or not sending a message. Unless the batch context explicitly assigns this article that one message-restraint slot, choose a different kind of action.

Write one continuous article for the supplied fallback contract. The app supplies the headline, date range, cycle fact line, and any approved aspect insert. Do not repeat planet-cycle length or sign-stay facts in the article body. Mention duration in prose only when the duration itself carries meaning beyond the engine fact line. Keep one central tension across every paragraph. The first sentence of the opening must stand alone as a clear, sendable recognition line. Name both the planet and the sign in the opening. Opening shows ordinary evidence. Tension names how the same strength creates a cost. Development follows that pressure into its consequence without announcing the advice. Close lands inside the consequence before {{exitDate}}; it is not a task-management instruction. Try this contains two or three specific actions that do not repeat the close. Write actions someone would actually say they took, not facilitation, negotiation, or project-management instructions.

Do not use coaching scaffolds such as "the practical choice is," "the correction is not," or "the next choice is whether." Do not replace them with equivalent lesson-signposting. State the transit, behavior, and consequence directly.

The engine-owned cycle fact line uses "all twelve signs"; the word "zodiac" remains banned everywhere.

Preserve the supplied surface contract, facts, output fields, and applicable hard constraints. Do not copy or analyze the owner passages. Do not return options, commentary, a source map, or a style explanation.

Return only strict JSON with exactly these keys: opening, tension, development, close, try_this. Use the literal {{entryDate}} in opening and {{exitDate}} in close. The try_this value must be an array of two or three one-sentence strings. Stop after the final action.

Use collective language. Do not use people, you, your, yours, yourself, or yourselves. Use we, someone, a named group, or the actual subject.

VERIFIED ASTROLOGY
{
  "planetFunction": "Mercury describes the mind in motion: thought, language, questions, interpretation, learning, writing, conversation, and the way information becomes useful. It shows how someone notices patterns, names what is happening, and makes decisions from what they observe.",
  "signExpression": "With Mercury in Capricorn, your communication is clear, organized, and serious. You’re good at strategic thinking and planning. Your words are chosen carefully and are often laced with practical wisdom.",
  "combinedMeaning": "With Mercury in Capricorn, communication becomes structured, practical, and focused on what can be built. You think in timelines, consequences, and usable plans.",
  "collectiveGift": "Mercury in Capricorn: the mind is strategic, serious, and oriented toward results.",
  "observableShadowBehaviors": [
    "Pessimism",
    "rigidity",
    "or withholding words until warmth disappears"
  ],
  "timing": "Mercury moves through all twelve signs in roughly a year, with retrograde periods that slow down communication, review, and decision-making. Its sign describes the style of thinking; its house shows where the mind stays busy.",
  "supportedDomains": [],
  "unsupportedDomainWarnings": [
    "Do not introduce a domain or consequence that is absent from the verified sources."
  ],
  "sourceRegisterBoundary": "The source passages below may use natal or second-person register. Extract their astrology only. Never reproduce their person, address the reader, or treat natal wording as Current Sky voice evidence.",
  "scenarioPolicy": "The writer may create related lived moments by combining the governed planet and sign meanings inside the supported domains. The transit remains the subject, and no single invented scenario may carry the whole card. The moments may be invented; the astrology may not.",
  "sourcePassages": [
    {
      "sourcePath": "packages/astro-knowledge/data/placements/sign/mercury-capricorn.json",
      "status": "REVIEWED",
      "register": "source_meaning_only_may_be_natal",
      "personBoundary": "Do not reproduce second-person or natal address from this source.",
      "text": "With Mercury in Capricorn, communication becomes structured, practical, and focused on what can be built. You think in timelines, consequences, and usable plans."
    },
    {
      "sourcePath": "packages/astro-knowledge/data/planetary/mercury.json",
      "status": "REVIEWED",
      "register": "source_meaning_only_may_be_natal",
      "personBoundary": "Do not reproduce second-person or natal address from this source.",
      "text": "Mercury describes the mind in motion: thought, language, questions, interpretation, learning, writing, conversation, and the way information becomes useful. It shows how someone notices patterns, names what is happening, and makes decisions from what they observe. Mercury moves through all twelve signs in roughly a year, with retrograde periods that slow down communication, review, and decision-making. Its sign describes the style of thinking; its house shows where the mind stays busy. With Mercury in Capricorn, your communication is clear, organized, and serious. You’re good at strategic thinking and planning. Your words are chosen carefully and are often laced with practical wisdom."
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
  "compiledPolicySha256": "8dfe6d6459f705689ee4267f2ae01b1262bff54bf5ffa0d822683bea0a2a7717",
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
      "id": "ED-022",
      "scope": {
        "surfaces": [
          "sky-placement"
        ]
      },
      "rule": "Reject sign-cliche stock scenes when they govern the central opening, tension, and development sequence. Isolated practical moves are exempt unless the central scene itself is a scheduling or dinner scene. The scene must follow from this placement's combined meaning at this transit's scale, and a year-long or slower transit cannot be reduced to one evening's logistics."
    },
    {
      "id": "ED-023",
      "scope": {
        "surfaces": [
          "sky-placement-moves"
        ]
      },
      "rule": "Moves must sound like actions someone would actually say they took, not workshop, facilitation, negotiation, or project-management instructions. Until an exact owner-approved moves exemplar exists, the moves section is the highest-risk section and any listed facilitation term there is a score-1 failure."
    },
    {
      "id": "ED-026",
      "scope": {
        "surfaces": [
          "sky-placement"
        ]
      },
      "rule": "A qualitative, non-numeric subperiod may trace to a reviewed residency fact only when it cannot exceed that residency. Numeric or date-like subperiods still require an explicit engine fact or render token."
    },
    {
      "id": "ED-027",
      "scope": {
        "surfaces": [
          "all-reader-copy",
          "sky-placement-judge"
        ]
      },
      "rule": "Apply the morning-reader test: every sentence must make sense on one tired read, with short sentences early, one idea per opening sentence, and no construction that requires a second pass to parse."
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
    "cycle_fact_line",
    "aspect_insert",
    "entryDate",
    "exitDate",
    "priorSign",
    "priorSignEntryDate",
    "priorSignExitDate",
    "previousResidencyEntryDate",
    "previousResidencyExitDate"
  ],
  "slotRequirements": {
    "opening": "One paragraph showing recognizable ordinary evidence. Include the literal {{entryDate}} slot once. Do not define the planet or sign generically.",
    "tension": "One paragraph naming one central tension and showing how the same useful behavior creates a cost when pushed too far.",
    "development": "Continue the transit's pressure through related lived moments and consequence. Do not announce advice with a coaching scaffold, introduce a new theme, or let one invented scenario carry the card.",
    "close": "One sentence that lands inside the consequence. Include the literal {{exitDate}} slot once. Do not assign a task, add reassurance, or stack a second conclusion.",
    "try_this": "Two actions by default, or three only when the third adds something different. Each action must be possible this week and specific to the placement."
  },
  "assembly": {
    "dateRange": "{{entryDate}} to {{exitDate}}",
    "cycleFactLine": "engine-rendered from reviewed planet-cycle-facts.json directly under the date range",
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
  "pace": "a few weeks"
}

ACTIVE FACT-GATED STRUCTURAL SLOTS
Only the slots below have backing facts. Use each at most once. The required output remains opening, tension, development, close, and try_this.

PRIOR-SIGN-HANDOFF
At or immediately before the hook, use one sentence saying where the planet arrives from and what changes. Use the supplied {{priorSign}}, {{priorSignEntryDate}}, and {{priorSignExitDate}} resolver tokens instead of literal moving facts. Use collective language and the planet's name; never use an appositive planet definition.
Write it once inside opening; do not add a new output key.
BACKING FACTS
{
  "priorSign": "sagittarius",
  "priorSignEntryDate": "December 6, 2026",
  "priorSignExitDate": "December 25, 2026",
  "renderTokens": {
    "priorSign": "{{priorSign}}",
    "priorSignEntryDate": "{{priorSignEntryDate}}",
    "priorSignExitDate": "{{priorSignExitDate}}"
  }
}

CYCLE-LINE
The engine renders one reviewed cycle fact line directly under the computed date range. Every number must come from planet-cycle-facts.json. Write 'all twelve signs'; the word 'zodiac' is banned. Do not render this slot for the Moon. The writer must not repeat the cycle line in article prose; duration belongs in prose only when it carries additional meaning.
The engine renders this block; do not add a new output key or restate it elsewhere.
BACKING FACTS
{
  "sourceId": "planet-cycle-facts",
  "sourcePath": "packages/astro-knowledge/data/modifiers/planet-cycle-facts.json",
  "sourceStatus": "REVIEWED",
  "zodiacCircuit": "about 1 year because Mercury stays near the Sun",
  "typicalSignStay": "roughly 2 weeks to 2 months per sign",
  "variabilityNote": "A retrograde in the sign can extend the residency."
}

CONCURRENT-EVENTS
Between the turn and moves, use one short paragraph explaining how the top one or two engine-ranked events inside the transit window change how the placement lands. Dates come from the engine and meaning comes from the astrology library. If no ranked events exist, omit the slot.
The engine renders this block; do not add a new output key or restate it elsewhere.
BACKING FACTS
{
  "eventsDuringTransit": [
    {
      "id": "aspect-mercury-square-neptune-2026-12-26t19:46:48.999z",
      "date": "December 26, 2026",
      "body": "mercury-square-neptune",
      "eventType": "exact-aspect",
      "meaning": "Mind meets imagination. Strong imagination and intuitive, associative thinking. Psychologically the square is inner tension to integrate: Slippery memory and blurred facts; what's real and what's imagined get confused. The growth is owning both sides instead of splitting them.",
      "meaningSource": "packages/astro-knowledge/data/transits/mercury-square-neptune.json"
    },
    {
      "id": "aspect-mercury-square-saturn-2026-12-30t23:54:36.999z",
      "date": "December 30, 2026",
      "body": "mercury-square-saturn",
      "eventType": "exact-aspect",
      "meaning": "Mind meets discipline. Serious, deep, careful thinking; apparent slowness that is caution, not lack of intelligence. Psychologically the square is inner tension to integrate: Brooding and mental heaviness; the remedy is keeping the mind on useful work. The growth is owning both sides instead of splitting them.",
      "meaningSource": "packages/astro-knowledge/data/transits/mercury-square-saturn.json"
    }
  ]
}

CYCLE-LOCATION
The article may state the previous residency's date range when the engine supplies both boundaries. Use {{previousResidencyEntryDate}} and {{previousResidencyExitDate}} instead of literal dates. State the dates only; never add celebrity, pop-culture, political, or era characterization.
Write it once inside development; do not add a new output key.
BACKING FACTS
{
  "sign": "capricorn",
  "entryDate": "January 8, 2025",
  "exitDate": "January 27, 2025",
  "renderTokens": {
    "entryDate": "{{previousResidencyEntryDate}}",
    "exitDate": "{{previousResidencyExitDate}}"
  }
}

OWNER VOICE MOVES - USE AT MOST 2 PER ARTICLE
- paired-questions: The lived section or turn may close on one pair of parallel questions.
  Owner example: Where have we exhausted ourselves defending something no longer worth the fight? Where have we built walls that now trap us rather than protect us?
- pattern-naming: The article may coin a short, plain-words name for the psychological pattern it describes.
  Owner example: the usefulness addiction.

FORMAT EXEMPLARS
These exact owner-approved cards establish register and beat movement only. Their tagline, hook, lived, turn, and moves fields are not the continuous fallback structure. Do not copy their astrology, scenarios, phrases, or date-token names; follow the supplied continuous output contract.

FORMAT EXEMPLAR 1: mars in capricorn
{
  "tagline": "The drive is back, and this time it wants proof, not promises.",
  "hook": "Make the plan, then make it real. Mars governs the part of us that acts, pushes, and fights for what matters; in Capricorn, it stops waiting to feel ready and starts asking what all this effort is actually building. The work may be slow, but the aim gets sharper.",
  "lived": "From {{transitStart}} to {{transitEnd}}, we may want extra proof that our time is going somewhere productive: the proposal revised until it holds, the budget faced without flinching, the difficult task handled before it grows teeth. Motivation looks less like a burst of feeling and more like returning to the daily work after the novelty has worn off. We may feel most alive when there is a clear finish line and a solid way to reach it.",
  "turn": "Tunnel vision sets in when the mountain is all anyone can see. We push past the point where the effort serves the goal, and the grind quietly becomes the way we prove our worth. That is not ambition anymore - that is trying to earn rest we never take. The smart move is to cut the climb when the summit turns out to be just another place to keep climbing from.",
  "moves": [
    "We can choose one long-delayed practical task and give it a two-hour block with a defined finish.",
    "We can write the next three steps for a goal that has been living only in our heads.",
    "We can cancel one obligation that looks productive but only proves we are busy."
  ]
}

FORMAT EXEMPLAR 2: saturn in capricorn
{
  "tagline": "Building something that lasts should not mean disappearing into the work.",
  "hook": "Saturn in Capricorn proves that life is not a report card. Saturn handles limits, standards, and the kind of work that holds its value over time; in Capricorn, it forces us to build from the ground up instead of chasing quick wins. This transit turns ambition into a structure we can actually stand inside.",
  "lived": "From {{transitStart}} until {{transitEnd}}, we may choose the training that takes longer, repair the budget instead of making excuses for overspending, or become the person who keeps a hard promise when nobody is watching. Work gets more serious because we can see what it could become if we stop treating every effort like a temporary experiment. The real shift is not doing more - it is building something sturdy enough to carry the life we are heading toward.",
  "turn": "But competence can become a hiding place. The way one more task replaces the conversation, the way rest keeps getting postponed until the next milestone, the way the bar keeps rising so no achievement has time to feel like enough. If nobody can reach us until the work is done, the work is running our lives.",
  "moves": [
    "We can choose one long-term goal and give it a weekly appointment with a defined stopping point.",
    "We can write down one responsibility carried alone, then ask a specific person to take a defined part of it.",
    "We can leave work at the promised time once this week, even with more still left to do."
  ]
}

FORMAT EXEMPLAR 3: neptune in libra
{
  "tagline": "Peace that depends on one person staying quiet is not peace.",
  "hook": "A relationship can look calm while someone disappears inside it. Neptune blurs the edges between us, and in Libra it makes fairness, beauty, and mutual understanding feel like needs we cannot live without. This transit can make the ideal partnership, workplace, or handshake deal feel close enough to reach for.",
  "lived": "Neptune stays in Libra from {{transitStart}} until {{transitEnd}}, giving ideas about fairness and relationship time to shape a generation. That long shift shows up in ordinary rooms: the meeting that keeps circling until nobody remembers the decision, the shared project polished past usefulness, the couple making every plan together because separate wants feel rude. The gift is real: more imagination in how we work, love, and make room for another person.",
  "turn": "The blur arrives when keeping everyone comfortable becomes more important than telling the truth. We edit our needs into something harmless, agree to terms we do not understand, and call it being the bigger person when one of us is simply the only one who adjusts. A relationship that needs someone's silence to stay peaceful is not peaceful.",
  "moves": [
    "We can name one decision we have been softening and state the actual preference in a single sentence.",
    "Before calling a compromise fair, we can ask who benefits if things stay exactly as they are.",
    "We can make one shared space more beautiful with a choice everyone involved explicitly agrees on."
  ]
}

FORMAT EXEMPLAR 4: venus in aries
{
  "tagline": "This is the season where wanting stops waiting for permission.",
  "hook": "Attraction should not require a translator. Venus governs what we love and what we reach for; in Aries, it quits circling the subject and goes straight for the spark. This transit makes desire feel less like a private theory and more like a reason to act.",
  "lived": "From {{transitStart}} to {{transitEnd}}, we may wear the thing we usually save for a better invitation, buy the ticket before the doubt has finished talking, or be the one who names the flirtation in the room. Affection gets bolder and taste gets cleaner: less collecting, more choosing. A small risk can feel strangely life-giving when it lets us move toward what we actually like.",
  "turn": "Chasing the thrill can make attraction feel like something to win. We may pursue the person who resists us, lose interest once they are available, or keep score over every difference in taste. The spark is real. Chasing it to prove we can catch it is how we burn through it.",
  "moves": [
    "We can ask someone on a date with a real plan, not a vague invitation.",
    "We can wear or make one thing that feels too bold for our usual taste.",
    "Before a quick purchase, we can name whether the pull is the object or the rush of choosing it."
  ]
}

OWNER-APPROVED PLACEMENT REFERENCE
This exact owner-approved continuous article demonstrates the finished writing operation and natural register. Use its clarity, pressure-and-consequence movement, and stopping point as the standard. Do not copy its placement-specific astrology, scenario, phrases, or timing tokens.

OWNER REFERENCE 1: jupiter in libra
{
  "opening": "After moving through {{priorSign}} from {{priorSignEntryDate}} to {{priorSignExitDate}}, Jupiter enters Libra on {{entryDate}}. Jupiter governs growth, opportunity, and the confidence to reach for more than what already exists. Libra is the sign of balance, connection, and how we get along with each other. Together they make this a year where growth comes through who we meet and what becomes possible together: a friend's introduction leads to a creative collaboration, and the finished work reaches an audience neither person could have found alone. Jupiter spends about a year in each sign and takes about 12 years to visit all twelve.",
  "tension": "Jupiter makes things bigger, and a few months in, the biggest thing is the list of what we have agreed to. Refusing feels rude, so we keep saying yes: another meeting, more of the work, another \"it's fine\" that is not true. Every extra request, correction, and follow-up starts going to the person who keeps saying yes. When a real choice comes up, we wait to hear what everyone else wants before saying what we want, and the decision goes to whoever speaks first. Somewhere along the way, being agreeable starts doing the work that honesty should be doing. The resentment stays quiet, because every one of these plans is something we technically agreed to.",
  "development": "Jupiter last moved through Libra from {{previousResidencyEntryDate}} to {{previousResidencyExitDate}}, and whatever was learned about fairness then gets its next round now. Just because nobody has complained does not mean an arrangement is fair. This year it helps to say what changed early: that Saturday does not work, that the effort stopped being even, that one voice keeps making the decisions. Some connections will get closer once that is said plainly. Others end when the person benefiting from the old agreement is asked to do more.",
  "close": "Before {{exitDate}}, we can quit one recurring commitment we have been keeping only because saying no feels rude.",
  "try_this": [
    "We can answer one pending invitation with a clear yes or no instead of another maybe.",
    "We can say which day works for us before asking what everyone else prefers.",
    "We can stop sending reminders for a responsibility that belongs to someone else."
  ]
}

OWNER-SELECTED WRITING BENCHMARK
This benchmark establishes the new surface standard: the transit remains the subject, lived moments illustrate it, coaching scaffolds are absent, and the ending lands inside the consequence. Use the writing operation, not the placement-specific wording.

WRITING BENCHMARK 1: mars in aries
Authorship: assistant_generated_owner_selected
Mars enters Aries on {{entryDate}}, and waiting starts to feel worse than whatever happens next. The call gets made. The answer gets demanded. The part everyone has been circling finally has a name.

The problem is that relief can look a lot like certainty. Once the pressure breaks, every delay feels personal and every objection feels like something to defeat. We answer before we know what was actually said. We fix the first problem we can reach, even when it is not the one causing the damage.

Mars in Aries is good at beginning. It is less interested in cleaning up what happened because nobody stopped long enough to decide what they were trying to change. Before {{exitDate}}, notice which fight is moving the situation forward and which one is only giving the anger somewhere to go.

Benchmark rules:
- The transit is the subject.
- Lived moments illustrate the transit without becoming the whole card.
- Pressure moves into consequence without a coaching scaffold.
- The ending leaves the reader inside the consequence instead of assigning a task.
- Cycle facts remain outside article prose.

OWNER-CORPUS WARMTH HARVEST
When harvest_mode is matched, use at most one supplied foundation near the end of development and preserve its meaning without forcing the words. When harvest_mode is none_found, add no imitation warmth; plain register is correct.
harvest_mode: none_found
No qualifying owner-corpus foundation was found. This is non-blocking. Keep the register plain and do not invent permission, reassurance, benediction, or a turn-toward-the-reader line.

MOVES EXEMPLAR
This exact owner-approved list establishes the register for practical actions only. Do not copy its placement-specific actions.
[
  "We can choose one long-term goal and give it a weekly appointment with a defined stopping point.",
  "We can write down one responsibility carried alone, then ask a specific person to take a defined part of it.",
  "We can leave work at the promised time once this week, even with more still left to do."
]

APPROVED OWNER VOCABULARY (optional menu, never a quota)
These choices come from the approved owner vocabulary bank and were selected for this placement. Use only what fits naturally. Do not force, stack, or repeat them.
Words: communication, patterns, learning, emotional, life, time, truth, world, feel, need.
Owner phrase evidence: None selected for this placement.

EXACT TASK
Write one complete continuous Current Sky fallback article for Mercury in Capricorn. Keep the transit as the subject and use lived moments as evidence without letting one invented scenario carry the card. Return only opening, tension, development, close, and try_this.

OWNER PASSAGE 1
Friendships may shift now. The ability to change friendship groups is a luxury. Not everyone gets to walk away from community, even when it stops feeling aligned.

OWNER PASSAGE 2
This isn't exactly gentle. This is when perfectly organized systems meet pure chaos. The plan falls apart. Mercury square Uranus wants the raw data, the unedited version.

OWNER PASSAGE 3
If job loss or work instability is part of what's happening, the anxiety about money makes rest almost impossible. This Full Moon illuminates the cost of running on stress hormones and calling it productivity.

OWNER PASSAGE 4
Set a two-line agenda before a meeting. Then create one honest boundary that protects recovery time. Block a half hour for a walk. Say no to a request that costs more than it gives.

OWNER PASSAGE 5
It reminds us that emotional honesty is the first form of resistance, and that safety cannot exist where truth is unwelcome. The systems outside are collapsing, but what we rebuild within ourselves now will shape the world we inherit. Choose with care. Choose with courage.

OWNER PASSAGE 6
Expect friction between digital breakthroughs and the scarcity of food, money, housing, and energy. The question is urgent: can new technologies support life, or will they drain it like a system that steals its own water supply?
