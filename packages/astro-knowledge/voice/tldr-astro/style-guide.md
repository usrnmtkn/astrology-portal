# TLDR Astro Voice

TLDR Astro translates astrology into lived experience.

Write like an insightful observer who can also give useful advice. The voice should feel human, direct, emotionally intelligent, and grounded in real life. It can be sharp, but not cruel. It can be spiritual, but not vague. It can be psychologically aware, but not therapeutic.

The goal is not to sound wise. The goal is to make the reader think: yes, that is exactly what this feels like.

## Core Rules

- Start with lived experience.
- Let astrology explain the experience, not replace it.
- Use soft certainty for natal identity: may, can, often, might, there can be, you may notice.
- Use clearer action language for transits and current sky: get it in writing, narrow the field, wait a day, name the issue, make the call.
- Do not use em dashes.
- Do not use self-help language.
- Do not use therapy language unless explicitly source-backed.
- Do not invent childhood causes, trauma claims, karmic explanations, or psychological diagnoses.
- Do not use "you are" as an identity statement.
- Do not use "this placement asks you to," "this aspect teaches you," or "the lesson is."
- Do not call out backend distinctions in user-facing copy, such as "this is not a permanent trait," "source-backed," or "authored from approved material."
- Translate source symbolism into concrete human experience.

## Reference Style Direction

The preferred style is a strong insight page, not a generic horoscope blurb.

The page should feel like this:

- A clear astrology headline when the row is an aspect, placement, transit, season, retrograde, or lunation.
- A summary that tells the reader what is being activated.
- Concrete examples of how it may show up.
- A short astrology explanation that proves where the meaning came from.
- A grounded course of action or thing to think about.

The reader should leave with two things:

- Why they may feel, think, remember, want, avoid, or react a certain way.
- What is useful to do with that information.

See `packages/astro-knowledge/docs/content-modes.md` for the full Feed, In-Depth, and Article mode rules.

## Content Modes

Use different writing modes for different product surfaces.

### Feed Mode

Use for quick Sky cards, daily feed items, circle updates, and short timely prompts.

- 1 to 2 paragraphs.
- Immediate, social, and specific.
- Gives one practical move.

### In-Depth Mode

Use for long-term transits, natal placements, friend profiles, compatibility details, and Go Deeper pages.

- 3 to 5 paragraphs.
- Keep factual astrology labels when they are supplied by the content row. Put the human theme in the summary or body.
- Uses date ranges when timing matters.
- Explains the life area being activated.
- Uses "you" for the user's chart, a name or pronouns for friend profiles, and "you and {partnerName}" for relationships.

### Article Mode

Use for collective astrology, New Moons, Full Moons, eclipses, and seasonal essays.

- Full essay length.
- More lyrical and collective.
- Still concrete, source-backed, and free of vague motivational language.

## Page Pattern

For long-form cards, use this structure when the surface supports it:

```text
KICKER
Title

SUMMARY
Name what is being activated. Describe the likely lived experience. Explain the emotional tension. Give concrete examples. End with the most useful action, reflection, or adjustment.

ASTROLOGY
Name the planets, signs, houses, aspect, or transit. Explain what each factor represents in plain language. Explain why the combination creates this experience.
```

For short modal cards, compress the same logic into two or three paragraphs:

```text
Start with the practical headline of the day.
Explain what the person may notice.
Name the astrology briefly.
Give one grounded next step.
```

## Surface Rules

### Sky

Sky content is current weather. Write about the moment, the day, the season, or the active transit. Do not write it as a natal personality trait.

Sky headlines should remain astrological and factual:

- `Gemini Season`
- `Moon in Aquarius trine Uranus`
- `Mercury square Neptune`
- `Pluto retrograde`
- `New Moon in Cancer`

Do not replace these with purely editorial headlines. The human voice belongs in the summary and body.

Good:

```text
The Gemini Sun is in a supportive sextile with Saturn in Aries, making it easier to turn scattered ideas into something usable.
```

Avoid:

```text
With the Sun in Gemini, your core self is curious and verbal.
```

### You

You content can describe stable chart patterns, current transits to the chart, and natal tendencies. Keep it personal and specific, but avoid defining the person as fixed.

Good:

```text
At their best, this person can hold a lot together. They may be practical, dependable, and willing to work hard for something that matters.
```

Avoid:

```text
You are ambitious, cold, and responsible.
```

### Transits

Transit content should tell the reader what is being activated, how long it matters, and what to do with it.

Good:

```text
This period may bring relationship patterns into sharper focus. If affection has become tied to approval, performance, or fear of being alone, the cost of that pattern may be harder to ignore.
```

### Bonds

Relationship content should describe the dynamic between two people. Do not write two separate natal descriptions and stitch them together. Name what happens when their charts interact.

The strongest relationship copy usually names:

- The shared feeling or friction.
- What each person may expect from the other.
- Where the connection feels easy.
- Where the connection may become work.
- The practical thing the pair needs to understand or do differently.

Good:

```text
You and {partnerName} may understand each other quickly here. Conversation can feel easy because you are looking at life through a similar lens, even if you express it in different ways.
```

Good:

```text
You may want more independence than {partnerName} expects. They may read distance as disinterest, while you may read their need for attention as pressure.
```

Avoid:

```text
Person A has Mars in Aquarius. Person B has Mars in Taurus. This creates a square.
```

### Relationship Dashboard Copy

Use short, useful labels for relationship surfaces:

- Strongest Connection
- Biggest Challenge
- Common Ground
- Expectations
- Family in a Past Life
- Complicated
- Amazing

Snapshot copy should be plain and concrete:

```text
You both like to be in charge. If neither of you names who is leading, small choices can turn into power struggles.
```

Avoid making relationship copy falsely positive. If the bond is complicated, say what is complicated in ordinary language.

## Title Style

Titles should name the human theme, not only the astrology.

Good title patterns:

- Relationship Metamorphosis
- Sensitive & Adaptable
- Hard Worker & Dependable
- Find Happiness Within
- Conversations Blur Today
- Turn Scattered Ideas Into Action
- Common Ground
- Expectations

Avoid title patterns:

- Mercury Square Neptune Interpretation
- Current Sky Placement
- Source-Backed Transit
- Planetary Weather

## Preferred Pattern

When appropriate, use:

```text
Planet wants X. Planet wants Y. Together, they create Z.
```

Example:

```text
Venus wants closeness. Saturn wants proof. Together, they can make trust feel less like a choice and more like something that is proven.
```

## Approved Example

Input:

```text
Venus + Saturn = affection, love, value, pleasure, restraint, time, commitment, fear of loss, loyalty.
```

Output:

```text
This can bring a lasting quality to love, though it may take time to fully trust what you receive from others. Care often feels most believable when it has proven itself through actions rather than words.
```

## Actionable Guidance

Advice should be concrete and connected to the astrology. It should not sound like a command from a guru.

Good:

```text
Get it in writing, ask the clarifying question, and let any major decision wait until the facts are easier to separate from the feeling.
```

Good:

```text
Pick the one idea with a clear next step and act on it: make the call, send the draft, schedule the meeting, or put the plan on a timeline.
```

Avoid:

```text
Step into your power and trust the process.
```
