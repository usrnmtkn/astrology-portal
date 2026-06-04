# TLDR Astro Content Modes

This document defines the writing mode for each content surface. It is a content and product contract, not a UI specification.

The same astrology source can render differently depending on where it appears. A quick Sky feed card should not sound like a long-term transit reading. A friend profile should not sound like a personal horoscope. A relationship card should describe what happens between two people, not two separate charts pasted together.

## Mode Summary

| Mode | Purpose | Length | Tone | Primary Surfaces |
| --- | --- | --- | --- | --- |
| Feed Mode | Quick timely insight | 1 to 2 paragraphs | immediate, social, specific | daily feed, Sky quick cards, circle updates |
| In-Depth Mode | Explain a major pattern | 3 to 5 paragraphs | direct, readable, emotionally specific | long transits, natal placements, friend profiles, compatibility details |
| Article Mode | Collective astrology essay | full essay | lyrical, collective, psychologically sharp | New Moons, Full Moons, eclipses, seasonal essays |

## Feed Mode

Feed Mode is for quick daily insight.

Use it when the user needs to understand what is active right now and what to do with it.

### Format

```text
Human headline.
What the user may notice.
Why this is happening astrologically.
One practical move.
```

### Example

```text
Conversations blur today. A message may land in a different tone than you meant, or a plan may sound clear in the moment and vague a few hours later.

Mercury in Cancer is thinking through feeling and personal context. Neptune in Aries adds urgency, imagination, and blurred edges. Get it in writing, ask the clarifying question, and let any major decision wait until the facts are easier to separate from the feeling.
```

## In-Depth Mode

In-Depth Mode is for long-term personal transits, natal placements, friend chart pages, and relationship detail pages.

This is the mode closest to the reference screenshots. The headline should be human, the astrology should be visible in glyphs or metadata, and the body copy should explain the life area being activated.

### Format

```text
DATE RANGE
Apr 29, 2026 - Jan 28, 2027

HUMAN TITLE
Find Happiness Within

ASTROLOGY SIGNATURE
Saturn conjunct Venus

SUMMARY
2 to 4 paragraphs of direct interpretation.

CTA
Go Deeper+
```

### Writing Rules

- Lead with the life area, not the abstract planet meaning.
- Keep astrology visible but secondary.
- Use the person's name or pronouns when reading a friend profile.
- Use "you" when reading the user's own chart.
- Use "you and {partnerName}" when reading a relationship surface.
- Use "may" instead of "will" for predictive claims.
- Avoid unsupported childhood, trauma, or fate claims.
- Give the reader something useful to notice, name, or do.

### Strong Pattern

```text
During this period, {name} may be shown where love, approval, or comfort has become too dependent on someone else's response. Relationships may feel more serious, not because love is disappearing, but because Saturn is asking what can actually hold.

If {name} is in a relationship, this may bring up questions around effort, commitment, and whether both people are carrying the connection in a real way. If {name} is single, this period may make it harder to use romance as proof that they are wanted or chosen.

Saturn does not make love easy for the sake of ease. It asks for proof. Venus wants closeness, pleasure, and warmth. Saturn wants to know what remains when attention fades, when life gets difficult, and when love has to become something more than chemistry.
```

## Article Mode

Article Mode is for collective astrology and lunar events.

Use it for New Moons, Full Moons, eclipses, ingresses, and seasonal essays where the reader is engaging with a broader piece of interpretation.

### Format

```text
Event title.
Opening energy statement.
Key aspects.
Collective meaning.
Personal application.
Reflection questions or practical application when appropriate.
Closing statement.
```

### Style

- More lyrical than Feed or In-Depth.
- Still source-backed and concrete.
- Can use collective language like "we" when the event is collective.
- Should not become vague, mystical, or motivational filler.

## Pronoun Rules

| Context | Pronoun Pattern |
| --- | --- |
| User reading own chart | you |
| User reading friend profile | {name}, they, he, she |
| User reading relationship | you and {partnerName} |
| Collective article | we, us, people, the collective |

## Relationship Mode Notes

Relationship content can use Feed Mode for quick snapshots or In-Depth Mode for detail pages.

Good relationship writing names the dynamic:

```text
You may want more independence than {partnerName} expects. They may want more consistency than you naturally give. This can create a mismatch where you feel pressured and they feel like you are not available enough, even when neither person is trying to hurt the other.
```

Avoid writing relationship content as two separate natal profiles:

```text
You have Mars in Aquarius. {partnerName} has Mars in Taurus. This creates a square.
```

## Quality Bar

Every rendered interpretation should answer:

- What is being activated?
- Why might this feel this way?
- What is the tension?
- What can the reader notice, name, or do?
- Is every claim traceable to the source material?
