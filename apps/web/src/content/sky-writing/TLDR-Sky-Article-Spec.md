# Sky Placement Articles — Voice-First Template (reworked Jul 27 2026)

Applies to direct-motion planet-in-sign pages on `/#sky/placement`.

The placement article is not a sign encyclopedia. Its job is to give the reader
one memorable way to recognize the transit in real life.

## The three-beat article

### 1. Hook

Open with the line someone would remember or send to a friend.

- 1–3 short sentences.
- Start on tension, recognition, or a sharp claim.
- Name the transit only after the human situation is clear when possible.
- It is allowed to sound written. A strange, exact phrase is better than a
  complete but forgettable explanation.

Examples:

- "You've been running on autopilot through a version of yourself that needs
  updating."
- "Pressure rises and we tighten up."
- "You already know the conversation you have been avoiding."
- "Some structures do not reform; they compost."

### 2. Lived expression

Show what the planet-sign combination does in ordinary life.

- 2–4 sentences.
- Include the transit's pace: days, weeks, years, or decades.
- Use concrete evidence: the unsent message, the corrected coffee order, the
  overfilled calendar, the person waiting for credit.
- Explain the planet through behavior, not through a list of keywords.
- Sign lore, rulership, modality, symbols, and season history belong in an
  optional "About [Sign]" block, never in the article body.

### 3. Turn

Name where the gift becomes the problem and end with a clean truth.

- 2–4 sentences.
- The shadow must be observable behavior, not an abstract warning.
- A directive is allowed when it is specific.
- End on the line with the most bite. Do not add a blessing or a soft summary
  after it.

## Optional live aspect

At most one tightly applying major aspect may be appended. It must add a new
pressure or opportunity to the article, not restate the placement.

Format:

`[Applying/separating fact and exact date]. [Concrete effect]. [Catch or move].`

## Voice rules

- Interesting before comprehensive.
- Direct, modern, and emotionally exact.
- Mix collective "we" with a direct "you" when the line earns it.
- Prefer verbs and scenes over adjective triplets.
- No generic sign lore in the body.
- No "for everyone at once," sign-off blessing, kumbaya closer, or motivational
  recap.
- No compulsory "opening / lore / meaning / confrontation" checklist. If a
  sentence exists only to satisfy coverage, cut it.

## Content architecture

The renderer uses three slots:

1. `sky-placement-hook/{planet}/{sign}`
2. `sky-placement-lived/{planet}/{sign}`
3. `sky-placement-turn/{planet}/{sign}`

An authored planet-sign slot always wins. Until a pair is authored, the fallback
uses the existing vivid per-planet hook, the planet's pace/mechanics paragraph,
and the sign trap plus planet practice. Fallback is coverage, not editorial gold.

Calibration pairs:

- Sun in Leo
- Moon in Capricorn
- Mercury in Cancer
- Venus in Virgo
- Moon in Scorpio
- Chiron in Aries
- Pluto in Aquarius

These seven must remain distinct when read without their headings. If two could
swap bodies without sounding wrong, the writing is not specific enough.
