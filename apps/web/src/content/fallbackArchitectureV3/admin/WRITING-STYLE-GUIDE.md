# TLDR Astro writing style guide (owner-issued 2026-07-22; revised 2026-08-31)

The canonical voice system for ALL reader-facing copy: authored cards, fallback rows, and any future authoring session (human or AI). The tone benchmark is the Lilith-in-Scorpio natal render at the bottom. This file is the reference; the machine-enforceable parts live in `contracts/CONTENT-ROLE-CONTRACT.json` styleRules and are checked by the verify scripts.

## 1. Core voice principles

- **Direct and grounded.** State facts and observations plainly. Speak to what actually happens on the ground, not abstract concepts.
- **Human consequence first.** Get to the normal human result quickly. Say that the project moves, the deadline blocks something, the facts change, someone promises too much, the workload grows, the agreement stops feeling fair, or the conversation turns into a fight. Do not make the reader translate an astrological concept before they know what is happening.
- **First-glance comprehension.** The reader should understand what is happening without translating astrological shorthand or abstract language into ordinary life. Lead with an event, behavior, decision, consequence, or change the reader can recognize.
- **Name the thing.** Prefer the specific ordinary noun over a vague stand-in. Say plan, deadline, payment, workload, message, decision, agreement, facts, promise, rule, job, or conversation when that is what you mean. Avoid writing around the subject with phrases such as "the version," "the arrangement," "the opening," "what has been promised," or "the situation" when a clearer noun is available.
- **Behavioral realism.** Focus on human friction, agency, and choices ("what you were shamed out of," "what comes back stronger," "say no once and see what happens").
- **One sentence, one job.** Do not make one sentence carry the situation, the astrology mechanism, the warning, and the advice at once. Let each sentence advance one clear idea. This is not a one-sentence limit on the opening. The human consequence may take two or more sentences when that makes the situation easier to understand.
- **Personality through precision, not decoration.** Do not add jokes, mystical language, quirky metaphors, cute phrasing, or novelty examples just to make simple astrology sound entertaining. A plain sentence is better when it says the consequence more clearly.
- **Rhythmic and punchy.** Vary sentence lengths intentionally. Follow a long, descriptive observation with a short, definitive punchline.
- **Zero fluff or hype.** Do not try to impress the reader. Do not use grandiose or mystical language to create artificial weight.

## 2. First-glance rule for astrology

Reader-facing astrology should explain the lived result before asking the reader to understand the mechanism. A technically correct sentence fails if the reader has to reread it to work out what is happening.

For transit and forecast copy, especially Calendar copy, use this order unless the surface has a stronger reason not to:

1. **What may happen or become clearer.** Start with the recognizable result: a project moves, a decision has to be made, support arrives, the workload changes, a conversation clears something up, a deadline sets the limit. Use one or more sentences when needed. Do not compress a clear two-sentence explanation into one overloaded sentence just to satisfy the structure.
2. **Why this astrology matters.** Name the transit or aspect and explain its mechanism in normal language. The astrology supports the situation; it is not the situation.
3. **What can go wrong.** Name the specific mistake the ease, pressure, conflict, or excitement can create.
4. **What to do with it.** End with the decision, boundary, check, or practical response that changes the outcome.

### The opening test

Cover the astrology explanation and read only the consequence-first opening. The first sentence should make sense on its own, but the opening may continue for another sentence or two when the situation needs more room. If a reader could reasonably ask "what does that mean?" or "what is actually happening?" after reading the opening, rewrite it.

An opening should contain a recognizable subject and consequence. Prefer statements such as "A deadline may force an answer" or "New information may change a plan you already committed to" over conceptual summaries such as "structure meets growth" or "an opening for change appears."

Prefer observable results over conceptual shorthand. Phrases such as "growth meets structure," "support and limits agree," "ambition finds somewhere to go," "an opening appears," "the current setup shifts," or "the confident version gets repeated" are not enough on their own because the reader still has to translate them.

Concrete does not mean niche. Do not invent a narrow scene just to make the copy feel lived-in. Use ordinary stakes such as time, money, workload, deadlines, responsibility, approval, recognition, conversations, and agreements when the astrology supports them. The reader should be able to recognize the pattern without having to share one very specific life situation.

For exact-day Calendar copy, the date already anchors the event. Do not add "this week," "last month," or another time comparison unless the underlying event data supports that comparison.

Use soft certainty for forecasts. "May," "can," and "could" are preferred when the astrology describes a possibility rather than a guaranteed event.

## 3. Punctuation and formatting

- **STRICT no em dash rule.** Never use em dashes. Use colons, semicolons, or periods to break ideas. (Machine-enforced.)
- **Colons for setup/payoff.** Link an observation to its sharp conclusion: "Your untamed side runs deep and knows it: desire, jealousy, the will to keep a secret."
- **Colloquial short sentences.** Short, imperative, or descriptive sentences create momentum: "Go first." "Say the thing." "Trade the spotlight on purpose."

## 4. Banned AI speak and replacements

- "This transit invites you to..." -> state it directly: "This is about X, not Y."
- "Consider that perhaps..." / "Remember to..." -> state the reality: "Look at what is actually happening."
- "Step into your power" / "Hold space" -> behavioral action: "Stop apologizing for wanting what you want."
- "Gentle reminder..." -> candid truth: "Let the bad mood drain out before you try to diagnose it."
- "A tapestry of..." / "Navigating the landscape" -> plain nouns: "the merged places," "the daily grind," "the long game."

(These sit on top of the existing machine-enforced bannedWords list: weather, steady family, heaven, facilitates, fosters, leverage, unsettles, etc.)

## 5. Voice shift: perspective rules

- **Self-voice (reader's own copy):** direct imperatives and self-sovereignty. Boundaries, accountability, direct choice. "Power games start where honesty stopped. Go first."
- **Friend-voice (third person / synastry / friend charts):** convert imperatives into objective behavioral descriptions. Never give the reader direct advice about someone else. Self-voice "Stop over-explaining your choices." becomes friend-voice "They tend to over-explain their choices when feeling put on the spot." Friend-voice bodies are AUTHORED separately (body_they), never pronoun-substituted.

## 6. Tone benchmark (target cadence)

> Lilith is the untamed part. She marks what you were shamed out of, and what comes back stronger once you stop apologizing for it. Your Lilith is in Scorpio, meaning you refuse and reclaim intensely, privately, and all-or-nothing, and what you want most is depth and honesty. Your untamed side runs deep and knows it: desire, jealousy, the will to keep a secret. You control it because you fear it. It settles when you tell the truth about wanting what you want.
