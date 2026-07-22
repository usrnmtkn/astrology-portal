# TLDR Astro writing style guide (owner-issued, 2026-07-22)

The canonical voice system for ALL reader-facing copy: authored cards, fallback rows, and any future authoring session (human or AI). The tone benchmark is the Lilith-in-Scorpio natal render at the bottom. This file is the reference; the machine-enforceable parts live in `contracts/CONTENT-ROLE-CONTRACT.json` styleRules and are checked by the verify scripts.

## 1. Core voice principles

- **Direct and grounded.** State facts and observations plainly. Speak to what actually happens on the ground, not abstract concepts.
- **Behavioral realism.** Focus on human friction, agency, and choices ("what you were shamed out of," "what comes back stronger," "say no once and see what happens").
- **Rhythmic and punchy.** Vary sentence lengths intentionally. Follow a long, descriptive observation with a short, definitive punchline.
- **Zero fluff or hype.** Do not try to impress the reader. Do not use grandiose or mystical language to create artificial weight.

## 2. Punctuation and formatting

- **STRICT no em dash rule.** Never use em dashes. Use colons, semicolons, or periods to break ideas. (Machine-enforced.)
- **Colons for setup/payoff.** Link an observation to its sharp conclusion: "Your untamed side runs deep and knows it: desire, jealousy, the will to keep a secret."
- **Colloquial short sentences.** Short, imperative, or descriptive sentences create momentum: "Go first." "Say the thing." "Trade the spotlight on purpose."

## 3. Banned AI speak and replacements

- "This transit invites you to..." -> state it directly: "This is about X, not Y."
- "Consider that perhaps..." / "Remember to..." -> state the reality: "Look at what is actually happening."
- "Step into your power" / "Hold space" -> behavioral action: "Stop apologizing for wanting what you want."
- "Gentle reminder..." -> candid truth: "Let the bad mood drain out before you try to diagnose it."
- "A tapestry of..." / "Navigating the landscape" -> plain nouns: "the merged places," "the daily grind," "the long game."

(These sit on top of the existing machine-enforced bannedWords list: weather, steady family, heaven, facilitates, fosters, leverage, unsettles, etc.)

## 4. Voice shift: perspective rules

- **Self-voice (reader's own copy):** direct imperatives and self-sovereignty. Boundaries, accountability, direct choice. "Power games start where honesty stopped. Go first."
- **Friend-voice (third person / synastry / friend charts):** convert imperatives into objective behavioral descriptions. Never give the reader direct advice about someone else. Self-voice "Stop over-explaining your choices." becomes friend-voice "They tend to over-explain their choices when feeling put on the spot." Friend-voice bodies are AUTHORED separately (body_they), never pronoun-substituted.

## 5. Tone benchmark (target cadence)

> Lilith is the untamed part. She marks what you were shamed out of, and what comes back stronger once you stop apologizing for it. Your Lilith is in Scorpio, meaning you refuse and reclaim intensely, privately, and all-or-nothing, and what you want most is depth and honesty. Your untamed side runs deep and knows it: desire, jealousy, the will to keep a secret. You control it because you fear it. It settles when you tell the truth about wanting what you want.
